import { adminClient, userClient } from '../_shared/admin.ts';
import { handleOptions, json } from '../_shared/http.ts';
import {
  ghsToPesewas,
  initializeTransaction,
  PaystackApiError,
  paystackProcessingPesewas,
  platformFeePesewas,
} from '../_shared/paystack.ts';

const cashMessage = 'This shop cannot take this online payment. Choose cash on delivery, or ask the vendor.';

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  const authorization = req.headers.get('Authorization');
  if (!authorization) return json({ error: 'not authenticated' }, 401);

  const callbackUrl = Deno.env.get('PAYMENT_RETURN_URL')?.trim() ?? '';
  if (callbackUrl.length > 0 && !callbackUrl.startsWith('https://')) {
    return json({ error: 'online payments are not configured' }, 503);
  }

  let orderId = '';
  try {
    const body = (await req.json()) as { order_id?: unknown };
    orderId = typeof body.order_id === 'string' ? body.order_id : '';
  } catch {
    return json({ error: 'order not found' }, 400);
  }
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) return json({ error: 'order not found' }, 400);

  const userScoped = userClient(authorization);
  const { data: userData, error: userError } = await userScoped.auth.getUser();
  const user = userData.user;
  const email = user?.email?.trim() ?? '';
  if (userError || !user || email.length === 0) return json({ error: 'not authenticated' }, 401);

  const admin = adminClient();
  const { data: order, error: orderError } = await admin
    .from('orders')
    .select('id, buyer_id, vendor_id, vendor_user_id, status, payment_method, payment_status, payment_due_at, total_amount')
    .eq('id', orderId)
    .maybeSingle();
  if (orderError || !order || order.buyer_id !== user.id) return json({ error: 'order not found' }, 404);
  if (order.payment_method !== 'paystack' || order.status !== 'accepted' || order.payment_status !== 'unpaid') {
    return json({ error: 'this order is not waiting for payment' }, 400);
  }
  const dueAt = order.payment_due_at ? Date.parse(order.payment_due_at) : Number.NaN;
  if (!Number.isFinite(dueAt) || dueAt <= Date.now()) {
    return json({ error: 'the payment window has closed' }, 400);
  }

  const { data: vendor, error: vendorError } = await admin
    .from('vendors')
    .select('status, is_paused')
    .eq('id', order.vendor_id)
    .maybeSingle();
  const ready = vendor && !vendorError && vendor.status === 'approved' && vendor.is_paused === false;
  if (!ready) return json({ error: cashMessage }, 400);

  const { data: billing } = await admin
    .from('vendor_billing')
    .select('subaccount_code')
    .eq('vendor_id', order.vendor_id)
    .maybeSingle();
  const subaccount = billing?.subaccount_code?.trim() ?? '';
  if (!subaccount) return json({ error: cashMessage }, 400);

  const { data: setting, error: settingError } = await admin
    .from('platform_settings')
    .select('value')
    .eq('key', 'platform_commission_percent')
    .maybeSingle();
  const rawPercent = setting?.value;
  const percent = typeof rawPercent === 'number'
    ? rawPercent
    : typeof rawPercent === 'string'
      ? Number(rawPercent)
      : Number.NaN;
  if (settingError || !Number.isFinite(percent)) return json({ error: 'online payments are not configured' }, 503);

  let amountPesewas = 0;
  let platformFee = 0;
  try {
    amountPesewas = ghsToPesewas(order.total_amount);
    platformFee = platformFeePesewas(amountPesewas, percent);
    const processing = paystackProcessingPesewas(amountPesewas);
    if (amountPesewas - platformFee <= processing) return json({ error: cashMessage }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'order total is not valid';
    return json({ error: message }, 400);
  }

  const reference = `cp_${crypto.randomUUID().replaceAll('-', '')}`;
  await admin.from('payments').update({ status: 'abandoned' }).eq('order_id', order.id).eq('status', 'pending');

  const { data: inserted, error: insertError } = await admin
    .from('payments')
    .insert({
      order_id: order.id,
      buyer_id: order.buyer_id,
      vendor_user_id: order.vendor_user_id,
      provider: 'paystack',
      reference,
      amount_pesewas: amountPesewas,
      currency: 'GHS',
      status: 'pending',
      commission_percent: percent,
      platform_fee_pesewas: platformFee,
    })
    .select('id')
    .single();
  if (insertError || !inserted) return json({ error: 'could not save payment' }, 500);

  const room = amountPesewas - platformFee - paystackProcessingPesewas(amountPesewas) - 1;
  const cashFee = await reservedCashFee(admin, inserted.id, order.vendor_id, room);

  try {
    const checkout = await initializeTransaction({
      email,
      amountPesewas,
      reference,
      subaccount,
      transactionChargePesewas: platformFee + cashFee,
      callbackUrl: callbackUrl || undefined,
      orderId: order.id,
    });
    if (!checkout.authorization_url || !checkout.reference) {
      await admin.from('payments').update({ status: 'abandoned' }).eq('id', inserted.id);
      return json({ error: 'Paystack request failed' }, 502);
    }

    const { error: saveError } = await admin
      .from('payments')
      .update({
        access_code: checkout.access_code ?? null,
        authorization_url: checkout.authorization_url,
      })
      .eq('id', inserted.id);
    if (saveError) return json({ error: 'could not save payment' }, 500);

    const { error: orderUpdateError } = await admin
      .from('orders')
      .update({ payment_status: 'pending' })
      .eq('id', order.id)
      .eq('payment_status', 'unpaid');
    if (orderUpdateError) return json({ error: 'could not save payment' }, 500);

    return json({ authorization_url: checkout.authorization_url, reference: checkout.reference });
  } catch (error) {
    await admin.from('payments').update({ status: 'abandoned' }).eq('id', inserted.id);
    if (error instanceof PaystackApiError && error.status === 400) {
      return json({ error: cashMessage }, 400);
    }
    console.error('create payment failed');
    return json({ error: 'Paystack request failed' }, 502);
  }
});

async function reservedCashFee(
  admin: ReturnType<typeof adminClient>,
  paymentId: string,
  vendorId: string,
  room: number,
): Promise<number> {
  if (room <= 0) return 0;
  const { data, error } = await admin.rpc('reserve_cash_charges', {
    p_payment_id: paymentId,
    p_vendor_id: vendorId,
    p_room: room,
  });
  if (error) {
    console.error('cash charge reserve skipped');
    return 0;
  }
  const amount = typeof data === 'number' ? data : Number(data);
  return Number.isInteger(amount) && amount > 0 ? amount : 0;
}
