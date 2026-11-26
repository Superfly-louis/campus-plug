import { adminClient, userClient } from '../_shared/admin.ts';
import { handleOptions, json } from '../_shared/http.ts';
import { paystackPlanCode, paystackRequest } from '../_shared/paystack.ts';

type Customer = { customer_code?: string };
type Plan = { amount?: number; currency?: string };
type Checkout = { authorization_url?: string };

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  const authorization = req.headers.get('Authorization');
  if (!authorization) return json({ error: 'not authenticated' }, 401);

  const planCode = paystackPlanCode();
  if (!planCode) return json({ error: 'verification checkout is not set up yet' }, 503);

  const userScoped = userClient(authorization);
  const { data: userData, error: userError } = await userScoped.auth.getUser();
  const user = userData.user;
  const email = user?.email?.trim() ?? '';
  if (userError || !user || email.length === 0) return json({ error: 'not authenticated' }, 401);

  const admin = adminClient();
  const { data: vendor, error: vendorError } = await admin
    .from('vendors')
    .select('id, status')
    .eq('owner_id', user.id)
    .maybeSingle();
  if (vendorError) return json({ error: 'vendor is not available' }, 500);
  if (!vendor || vendor.status !== 'approved') return json({ error: 'vendor is not available' }, 400);

  try {
    const customerCode = await ensureCustomer(admin, vendor.id, email);
    const plan = await paystackRequest<Plan>(`/plan/${encodeURIComponent(planCode)}`);
    if (!Number.isInteger(plan.amount) || (plan.amount ?? 0) <= 0) {
      throw new Error('The Paystack plan amount is not valid');
    }
    const checkout = await paystackRequest<Checkout>('/transaction/initialize', {
      method: 'POST',
      body: JSON.stringify({
        email,
        amount: plan.amount,
        currency: plan.currency ?? 'GHS',
        plan: planCode,
        metadata: { vendor_id: vendor.id, customer_code: customerCode },
      }),
    });
    if (!checkout.authorization_url) return json({ error: 'Paystack request failed' }, 502);
    return json({ authorization_url: checkout.authorization_url });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Paystack request failed';
    console.error('paystack checkout failed', message);
    return json({ error: message }, 502);
  }
});

async function ensureCustomer(
  admin: ReturnType<typeof adminClient>,
  vendorId: string,
  email: string,
): Promise<string> {
  const { data: existing } = await admin
    .from('vendor_billing')
    .select('customer_code')
    .eq('vendor_id', vendorId)
    .maybeSingle();
  if (existing?.customer_code) return existing.customer_code;

  let customer: Customer;
  try {
    customer = await paystackRequest<Customer>('/customer', {
      method: 'POST',
      body: JSON.stringify({ email, metadata: { vendor_id: vendorId } }),
    });
  } catch {
    customer = await paystackRequest<Customer>(`/customer/${encodeURIComponent(email)}`);
  }

  const customerCode = customer.customer_code;
  if (!customerCode) throw new Error('Paystack request failed');

  const { error } = await admin.from('vendor_billing').upsert({
    vendor_id: vendorId,
    customer_code: customerCode,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error('could not save billing');
  return customerCode;
}
