import { adminClient } from '../_shared/admin.ts';
import { handleOptions, json, webhookSecretMatches } from '../_shared/http.ts';
import { settlePayment, type PaymentRow } from '../_shared/order-payment.ts';

const batchSize = 10;

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);
  if (!(await webhookSecretMatches(req, 'PAYMENTS_SWEEP_SECRET'))) {
    return json({ error: 'unauthorized' }, 401);
  }

  const now = Date.now();
  const olderThan = new Date(now - 10 * 60 * 1000).toISOString();
  const newerThan = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const admin = adminClient();
  const { data, error } = await admin
    .from('payments')
    .select('id, reference, order_id, amount_pesewas, currency, status')
    .eq('status', 'pending')
    .lt('created_at', olderThan)
    .gt('created_at', newerThan)
    .order('created_at', { ascending: true })
    .limit(batchSize);
  if (error) return json({ error: 'could not read payments' }, 500);

  let checked = 0;
  for (const payment of data ?? []) {
    try {
      await settlePayment(admin, payment as PaymentRow);
      checked += 1;
    } catch (settleError) {
      console.error('payment sweep failed', settleError instanceof Error ? settleError.message : 'error');
    }
  }

  return json({ checked });
});
