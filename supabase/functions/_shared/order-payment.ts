import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

import { verifyTransaction, type VerifiedTransaction } from './paystack.ts';

export type PaymentRow = {
  id: string;
  reference: string;
  order_id: string | null;
  amount_pesewas: number;
  currency: string;
  status: string;
};

export type SettleResult = 'success' | 'failed' | 'abandoned' | 'pending' | 'mismatch';

export async function settlePayment(
  admin: SupabaseClient,
  payment: PaymentRow,
): Promise<SettleResult> {
  const verified = await verifyTransaction(payment.reference);
  return await applyVerification(admin, payment, verified);
}

export async function applyVerification(
  admin: SupabaseClient,
  payment: PaymentRow,
  verified: VerifiedTransaction,
): Promise<SettleResult> {
  const status = verified.status ?? '';
  if (status !== 'success' && status !== 'failed' && status !== 'abandoned') return 'pending';

  const orderId = metadataOrderId(verified);
  if (orderId && payment.order_id && orderId !== payment.order_id) return 'mismatch';
  if (verified.reference && verified.reference !== payment.reference) return 'mismatch';
  const storedAmount = typeof payment.amount_pesewas === 'number'
    ? payment.amount_pesewas
    : Number(payment.amount_pesewas);
  const verifiedAmount = typeof verified.amount === 'number' ? verified.amount : Number.NaN;
  if (!Number.isInteger(storedAmount) || !Number.isInteger(verifiedAmount) || verifiedAmount !== storedAmount) {
    return 'mismatch';
  }
  if (verified.currency !== 'GHS' || payment.currency !== 'GHS') return 'mismatch';

  if (status === 'success') {
    const { error } = await admin.rpc('finalize_payment_success', {
      reference: payment.reference,
      amount_pesewas: verified.amount,
      currency: verified.currency,
      channel: verified.channel ?? null,
      fees: verified.fees_split ?? null,
    });
    if (error) {
      if (isMismatch(error.message)) return 'mismatch';
      throw new Error('could not record payment');
    }
    return 'success';
  }

  const { error } = await admin.rpc('finalize_payment_failure', {
    reference: payment.reference,
    reason: status,
  });
  if (error) throw new Error('could not record payment');
  return status === 'abandoned' ? 'abandoned' : 'failed';
}

function metadataOrderId(verified: VerifiedTransaction): string | null {
  const metadata = verified.metadata;
  if (!metadata || typeof metadata !== 'object') return null;
  return typeof metadata.order_id === 'string' ? metadata.order_id : null;
}

function isMismatch(message: string): boolean {
  const text = message.toLowerCase();
  return text.includes('does not match') || text.includes('currency must be ghs') || text.includes('payment not found');
}
