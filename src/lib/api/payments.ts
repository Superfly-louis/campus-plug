import { supabase } from '@/lib/supabase';

import { raiseIfError, requireUserId } from '@/lib/api/shared';

import type { DbPaymentStatus } from '@/constants/orderStatus';
import { Constants, type Database } from '../../../types/database.types';

type PaymentRow = Database['public']['Tables']['payments']['Row'];

const attemptStatuses = ['pending', 'success', 'failed', 'abandoned', 'refunded'] as const;
const verifyResults = ['success', 'failed', 'abandoned', 'pending', 'mismatch'] as const;

export type PaymentAttemptStatus = (typeof attemptStatuses)[number];
export type VerifyPaymentResult = (typeof verifyResults)[number];

export type PaymentAttempt = {
  id: string;
  orderId: string | null;
  reference: string;
  authorizationUrl: string | null;
  amountPesewas: number;
  currency: string;
  status: PaymentAttemptStatus;
  platformFeePesewas: number | null;
  paystackFeePesewas: number | null;
  vendorAmountPesewas: number | null;
  createdAt: string;
};

export type PaymentCheckout = {
  authorizationUrl: string;
  reference: string;
};

export type PaymentCheck = {
  result: VerifyPaymentResult | null;
  paymentStatus: DbPaymentStatus;
  payment: {
    reference: string;
    status: PaymentAttemptStatus;
  amountPesewas: number | null;
  currency: string | null;
} | null;
};

export type PaymentTerms = {
  commissionPercent: number | null;
  minOnlineOrderGhs: number | null;
};

const paymentColumns =
  'id, order_id, reference, authorization_url, amount_pesewas, currency, status, platform_fee_pesewas, paystack_fee_pesewas, vendor_amount_pesewas, created_at';

function isAttemptStatus(value: unknown): value is PaymentAttemptStatus {
  return typeof value === 'string' && (attemptStatuses as readonly string[]).includes(value);
}

function isPaymentStatus(value: unknown): value is DbPaymentStatus {
  return typeof value === 'string' && (Constants.public.Enums.payment_status as readonly string[]).includes(value);
}

function isVerifyResult(value: unknown): value is VerifyPaymentResult {
  return typeof value === 'string' && (verifyResults as readonly string[]).includes(value);
}

function toAttempt(
  row: Pick<
    PaymentRow,
    | 'id'
    | 'order_id'
    | 'reference'
    | 'authorization_url'
    | 'amount_pesewas'
    | 'currency'
    | 'status'
    | 'platform_fee_pesewas'
    | 'paystack_fee_pesewas'
    | 'vendor_amount_pesewas'
    | 'created_at'
  >,
): PaymentAttempt {
  if (!isAttemptStatus(row.status)) throw new Error('could not read payment');
  return {
    id: row.id,
    orderId: row.order_id,
    reference: row.reference,
    authorizationUrl: row.authorization_url,
    amountPesewas: row.amount_pesewas,
    currency: row.currency,
    status: row.status,
    platformFeePesewas: row.platform_fee_pesewas,
    paystackFeePesewas: row.paystack_fee_pesewas,
    vendorAmountPesewas: row.vendor_amount_pesewas,
    createdAt: row.created_at,
  };
}

async function functionError(error: unknown): Promise<string> {
  const context =
    typeof error === 'object' && error !== null && 'context' in error
      ? (error as { context?: unknown }).context
      : null;
  const readJson =
    context && typeof context === 'object' && 'json' in context
      ? (context as { json?: unknown }).json
      : null;
  if (typeof readJson === 'function') {
    try {
      const payload: unknown = await readJson.call(context);
      if (typeof payload === 'object' && payload !== null && 'error' in payload) {
        const value = (payload as { error?: unknown }).error;
        if (typeof value === 'string' && value.length > 0) return value;
      }
    } catch {
      // The function body was not JSON.
    }
  }
  if (error instanceof Error && error.message && !error.message.includes('non-2xx')) return error.message;
  return 'That request failed. Try again.';
}

function readRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null) return null;
  return value as Record<string, unknown>;
}

export async function createPayment(orderId: string): Promise<PaymentCheckout> {
  await requireUserId();
  const { data, error } = await supabase.functions.invoke('create-payment', { body: { order_id: orderId } });
  if (error) throw new Error(await functionError(error));
  const body = readRecord(data);
  const authorizationUrl = body?.authorization_url;
  const reference = body?.reference;
  if (
    typeof authorizationUrl !== 'string' ||
    authorizationUrl.length === 0 ||
    typeof reference !== 'string' ||
    reference.length === 0
  ) {
    throw new Error('Paystack request failed');
  }
  return { authorizationUrl, reference };
}

export async function verifyPayment(orderId: string): Promise<PaymentCheck> {
  await requireUserId();
  const { data, error } = await supabase.functions.invoke('verify-payment', { body: { order_id: orderId } });
  if (error) throw new Error(await functionError(error));
  const body = readRecord(data);
  if (!body || !isPaymentStatus(body.payment_status)) throw new Error('could not verify payment');
  const result = body.result == null ? null : body.result;
  if (result !== null && !isVerifyResult(result)) throw new Error('could not verify payment');
  return {
    result,
    paymentStatus: body.payment_status,
    payment: readCheckedPayment(body.payment),
  };
}

function readCheckedPayment(value: unknown): PaymentCheck['payment'] {
  if (value == null) return null;
  const row = readRecord(value);
  if (!row || typeof row.reference !== 'string' || !isAttemptStatus(row.status)) throw new Error('could not verify payment');
  return {
    reference: row.reference,
    status: row.status,
    amountPesewas: typeof row.amount_pesewas === 'number' ? row.amount_pesewas : null,
    currency: typeof row.currency === 'string' ? row.currency : null,
  };
}

export async function getLatestPayment(orderId: string): Promise<PaymentAttempt | null> {
  await requireUserId();
  const { data, error } = await supabase
    .from('payments')
    .select(paymentColumns)
    .eq('order_id', orderId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  raiseIfError(error);
  if (!data) return null;
  return toAttempt(data);
}

export async function getPaymentTerms(): Promise<PaymentTerms> {
  const { data, error } = await supabase.rpc('get_public_payment_terms');
  raiseIfError(error);
  const row = data?.[0];
  if (!row) return { commissionPercent: null, minOnlineOrderGhs: null };
  return {
    commissionPercent: typeof row.commission_percent === 'number' ? row.commission_percent : null,
    minOnlineOrderGhs: typeof row.min_online_order_ghs === 'number' ? row.min_online_order_ghs : null,
  };
}
