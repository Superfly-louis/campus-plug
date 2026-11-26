import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

import { adminClient } from '../_shared/admin.ts';
import { handleOptions, json } from '../_shared/http.ts';
import { settlePayment, type PaymentRow } from '../_shared/order-payment.ts';
import {
  graceUntil,
  monthPlusGrace,
  paystackPlanCode,
  planCodeOf,
  webhookSignatureIsValid,
  type PaystackEvent,
} from '../_shared/paystack.ts';

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  const body = await req.text();
  if (!(await webhookSignatureIsValid(body, req))) return json({ error: 'invalid signature' }, 401);

  let event: PaystackEvent;
  try {
    event = JSON.parse(body) as PaystackEvent;
  } catch {
    return json({ error: 'invalid payload' }, 400);
  }

  try {
    await routeEvent(event);
  } catch (error) {
    console.error('paystack webhook failed', error instanceof Error ? error.message : 'error');
    return json({ error: 'webhook failed' }, 500);
  }

  return json({ received: true });
});

async function routeEvent(event: PaystackEvent): Promise<void> {
  const name = event.event ?? '';
  const reference = event.data?.reference ?? '';
  const admin = adminClient();

  if (name === 'charge.success' || name === 'charge.failed') {
    const payment = reference ? await findPayment(admin, reference) : null;
    if (payment) {
      await settleKnownPayment(admin, name, payment, event);
      return;
    }
    if (isVerificationCharge(event)) {
      await applySubscriptionEvent(event);
      return;
    }
    if (reference) await recordResult(admin, name, reference, event, 'mismatch');
    return;
  }

  if (name === 'refund.processed' || name === 'refund.failed') {
    await applyRefund(admin, name, event);
    return;
  }

  if (
    name === 'subscription.create'
    || name === 'invoice.payment_failed'
    || name === 'subscription.disable'
  ) {
    await applySubscriptionEvent(event);
  }
}

async function settleKnownPayment(
  admin: SupabaseClient,
  eventType: string,
  payment: PaymentRow,
  event: PaystackEvent,
): Promise<void> {
  if (!(await claimEvent(admin, eventType, payment.reference, event))) return;
  const result = await settlePayment(admin, payment);
  await finishEvent(admin, eventType, payment.reference, result === 'mismatch' ? 'mismatch' : 'processed');
}

async function applyRefund(admin: SupabaseClient, eventType: string, event: PaystackEvent): Promise<void> {
  const transactionReference = event.data?.transaction_reference ?? event.data?.reference ?? '';
  const dedupeReference = event.data?.refund_reference ?? transactionReference;
  if (!dedupeReference || !transactionReference) return;

  const payment = await findPayment(admin, transactionReference);
  if (!payment) {
    await recordResult(admin, eventType, dedupeReference, event, 'mismatch');
    return;
  }
  if (!(await claimEvent(admin, eventType, dedupeReference, event))) return;

  if (eventType === 'refund.processed') {
    await admin.from('payments').update({ status: 'refunded', needs_refund: false }).eq('id', payment.id);
    if (payment.order_id) {
      await admin.from('orders').update({ payment_status: 'refunded' }).eq('id', payment.order_id);
    }
  } else {
    await admin.from('admin_audit_log').insert({
      admin_id: null,
      action: 'refund_failed',
      target_type: 'payment',
      target_id: payment.id,
      metadata: { reference: transactionReference, order_id: payment.order_id },
    });
  }

  await finishEvent(admin, eventType, dedupeReference, 'processed');
}

function isVerificationCharge(event: PaystackEvent): boolean {
  const planCode = paystackPlanCode();
  const incoming = planCodeOf(event);
  return Boolean(planCode && incoming === planCode && event.data?.status === 'success');
}

async function findPayment(admin: SupabaseClient, reference: string): Promise<PaymentRow | null> {
  const { data, error } = await admin
    .from('payments')
    .select('id, reference, order_id, amount_pesewas, currency, status')
    .eq('reference', reference)
    .maybeSingle();
  if (error) throw new Error('could not read payment');
  return data as PaymentRow | null;
}

async function claimEvent(
  admin: SupabaseClient,
  eventType: string,
  reference: string,
  event: PaystackEvent,
): Promise<boolean> {
  if (eventType.length === 0 || eventType.length > 80 || reference.length === 0 || reference.length > 120) return false;
  const { error } = await admin.from('payment_events').insert({
    event_type: eventType,
    reference,
    payload: slimEvent(event),
  });
  if (!error) return true;
  if (error.code !== '23505') throw new Error('could not record event');
  const { data } = await admin
    .from('payment_events')
    .select('processed_at')
    .eq('event_type', eventType)
    .eq('reference', reference)
    .maybeSingle();
  return !data?.processed_at;
}

async function recordResult(
  admin: SupabaseClient,
  eventType: string,
  reference: string,
  event: PaystackEvent,
  result: string,
): Promise<void> {
  if (!(await claimEvent(admin, eventType, reference, event))) return;
  await finishEvent(admin, eventType, reference, result);
}

async function finishEvent(
  admin: SupabaseClient,
  eventType: string,
  reference: string,
  result: string,
): Promise<void> {
  await admin
    .from('payment_events')
    .update({ processed_at: new Date().toISOString(), result })
    .eq('event_type', eventType)
    .eq('reference', reference);
}

function slimEvent(event: PaystackEvent): Record<string, unknown> {
  return {
    event: event.event ?? null,
    reference: event.data?.reference ?? event.data?.transaction_reference ?? null,
    status: event.data?.status ?? null,
    amount: event.data?.amount ?? null,
    currency: event.data?.currency ?? null,
    channel: event.data?.channel ?? null,
  };
}

async function applySubscriptionEvent(event: PaystackEvent): Promise<void> {
  const planCode = paystackPlanCode();
  const name = event.event ?? '';
  const data = event.data;
  if (!data || !planCode) return;

  const incomingPlan = planCodeOf(event);
  if (incomingPlan && incomingPlan !== planCode) return;

  const admin = adminClient();
  const vendorId = await findVendorId(admin, event);
  if (!vendorId) return;

  if (name === 'charge.success') {
    if (data.status !== 'success' || !incomingPlan) return;
    const until = (data.next_payment_date && graceUntil(data.next_payment_date))
      || (data.subscription?.next_payment_date && graceUntil(data.subscription.next_payment_date))
      || (data.paid_at && monthPlusGrace(data.paid_at));
    if (!until) return;
    await markPaid(admin, vendorId, until, data.reference, data.subscription?.subscription_code ?? data.subscription_code);
    return;
  }

  if (name === 'subscription.create') {
    const until = data.next_payment_date ? graceUntil(data.next_payment_date) : null;
    await markPaid(
      admin,
      vendorId,
      until,
      data.reference,
      data.subscription_code ?? data.subscription?.subscription_code,
    );
    return;
  }

  if (name === 'invoice.payment_failed') {
    await admin
      .from('vendors')
      .update({ subscription_status: 'past_due' })
      .eq('id', vendorId)
      .eq('subscription_status', 'active');
    return;
  }

  if (name === 'subscription.disable') {
    await admin
      .from('vendors')
      .update({ subscription_status: 'inactive', verified_until: null })
      .eq('id', vendorId);
    await admin
      .from('vendor_billing')
      .update({ subscription_code: null, updated_at: new Date().toISOString() })
      .eq('vendor_id', vendorId);
  }
}

async function findVendorId(admin: SupabaseClient, event: PaystackEvent): Promise<string | null> {
  const metadataId = event.data?.metadata?.vendor_id;
  if (metadataId) {
    const { data } = await admin.from('vendors').select('id').eq('id', metadataId).maybeSingle();
    if (data?.id) return data.id;
  }

  const customerCode = event.data?.customer?.customer_code;
  if (customerCode) {
    const { data } = await admin
      .from('vendor_billing')
      .select('vendor_id')
      .eq('customer_code', customerCode)
      .maybeSingle();
    if (data?.vendor_id) return data.vendor_id;
  }

  const subscriptionCode = event.data?.subscription_code ?? event.data?.subscription?.subscription_code;
  if (subscriptionCode) {
    const { data } = await admin
      .from('vendor_billing')
      .select('vendor_id')
      .eq('subscription_code', subscriptionCode)
      .maybeSingle();
    if (data?.vendor_id) return data.vendor_id;
  }

  return null;
}

async function markPaid(
  admin: SupabaseClient,
  vendorId: string,
  until: string | null,
  reference: string | undefined,
  subscriptionCode: string | undefined,
): Promise<void> {
  const { data: billing } = await admin
    .from('vendor_billing')
    .select('customer_code, subscription_code, last_reference')
    .eq('vendor_id', vendorId)
    .maybeSingle();

  const { data: vendor } = await admin.from('vendors').select('verified_until').eq('id', vendorId).maybeSingle();
  const current = vendor?.verified_until ? Date.parse(vendor.verified_until) : 0;
  const next = until ? Date.parse(until) : 0;
  const verifiedUntil = next > current ? until : vendor?.verified_until ?? null;

  if (verifiedUntil) {
    const { error: vendorError } = await admin
      .from('vendors')
      .update({ subscription_status: 'active', verified_until: verifiedUntil })
      .eq('id', vendorId);
    if (vendorError) throw new Error('could not update subscription');
  }

  const { error: billingError } = await admin.from('vendor_billing').upsert({
    vendor_id: vendorId,
    customer_code: billing?.customer_code ?? null,
    subscription_code: subscriptionCode ?? billing?.subscription_code ?? null,
    last_reference: reference ?? billing?.last_reference ?? null,
    updated_at: new Date().toISOString(),
  });
  if (billingError) throw new Error('could not save billing');
}
