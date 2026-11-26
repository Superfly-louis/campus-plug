import { adminClient, userClient } from '../_shared/admin.ts';
import { handleOptions, json } from '../_shared/http.ts';
import { settlePayment, type PaymentRow } from '../_shared/order-payment.ts';

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  const authorization = req.headers.get('Authorization');
  if (!authorization) return json({ error: 'not authenticated' }, 401);

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
  if (userError || !user) return json({ error: 'not authenticated' }, 401);

  const admin = adminClient();
  const { data: order, error: orderError } = await admin
    .from('orders')
    .select('id, buyer_id, payment_status')
    .eq('id', orderId)
    .maybeSingle();
  if (orderError || !order || order.buyer_id !== user.id) return json({ error: 'order not found' }, 404);

  const { data: payment, error: paymentError } = await admin
    .from('payments')
    .select('id, reference, order_id, amount_pesewas, currency, status')
    .eq('order_id', order.id)
    .eq('buyer_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (paymentError) return json({ error: 'could not read payment' }, 500);
  if (!payment) {
    return json({ payment_status: order.payment_status, payment: null });
  }

  try {
    const result = await settlePayment(admin, payment as PaymentRow);
    const { data: current } = await admin
      .from('payments')
      .select('reference, status, amount_pesewas, currency')
      .eq('id', payment.id)
      .maybeSingle();
    const { data: currentOrder } = await admin.from('orders').select('payment_status').eq('id', order.id).maybeSingle();
    return json({
      result,
      payment_status: currentOrder?.payment_status ?? order.payment_status,
      payment: current ?? { reference: payment.reference, status: payment.status },
    });
  } catch (error) {
    console.error('verify payment failed', error instanceof Error ? error.message : 'error');
    return json({ error: 'could not verify payment' }, 500);
  }
});
