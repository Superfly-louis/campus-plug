import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

import { adminClient, userClient } from '../_shared/admin.ts';
import { handleOptions, json } from '../_shared/http.ts';
import {
  createSubaccount,
  fetchSubaccount,
  listGhsBanks,
  PaystackApiError,
  paystackUsesTestKey,
  resolveBankAccount,
  updateSubaccount,
} from '../_shared/paystack.ts';

type PayoutAction = 'status' | 'banks' | 'resolve' | 'connect';

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  const authorization = req.headers.get('Authorization');
  if (!authorization) return json({ error: 'not authenticated' }, 401);

  const userScoped = userClient(authorization);
  const { data: userData, error: userError } = await userScoped.auth.getUser();
  const user = userData.user;
  if (userError || !user) return json({ error: 'not authenticated' }, 401);

  let action: PayoutAction = 'status';
  let bankCode = '';
  let accountNumber = '';
  let confirmedName = '';
  try {
    const body = (await req.json()) as {
      action?: unknown;
      bank_code?: unknown;
      account_number?: unknown;
      account_name?: unknown;
    };
    if (body.action === 'banks' || body.action === 'resolve' || body.action === 'connect' || body.action === 'status') {
      action = body.action;
    }
    bankCode = typeof body.bank_code === 'string' ? body.bank_code.trim() : '';
    accountNumber = typeof body.account_number === 'string' ? body.account_number.replace(/\s+/g, '') : '';
    confirmedName = typeof body.account_name === 'string' ? body.account_name.trim() : '';
  } catch {
    return json({ error: 'check the bank and account number' }, 400);
  }

  const admin = adminClient();
  const { data: vendor, error: vendorError } = await admin
    .from('vendors')
    .select('id, shop_name, status')
    .eq('owner_id', user.id)
    .maybeSingle();
  if (vendorError) return json({ error: 'could not read shop' }, 500);
  if (!vendor || vendor.status !== 'approved') return json({ error: 'you need an approved shop to add a payout account' }, 400);

  try {
    if (action === 'status') return json(await payoutStatus(admin, vendor.id));
    if (action === 'banks') {
      const banks = await listGhsBanks();
      if (banks.length === 0) return json({ error: 'the bank list could not be loaded' }, 503);
      return json({ banks });
    }
    if (!/^[0-9A-Za-z]{2,10}$/.test(bankCode) || !/^[0-9]{10,16}$/.test(accountNumber)) {
      return json({ error: 'check the bank and account number' }, 400);
    }
    const resolved = await resolveAccount(accountNumber, bankCode);
    if (action === 'resolve') {
      if (!resolved) return json({ account_name: null, unconfirmed: true, account_number: accountNumber });
      return json({ account_name: resolved.accountName, unconfirmed: false, account_number: resolved.accountNumber });
    }
    const settlementNumber = resolved?.accountNumber ?? accountNumber;
    if (resolved && confirmedName.toLowerCase() !== resolved.accountName.toLowerCase()) {
      return json({ error: 'confirm the account name and try again' }, 400);
    }
    if (!resolved && confirmedName.length > 0) return json({ error: 'confirm the account name and try again' }, 400);
    const businessName = vendor.shop_name.trim().slice(0, 100);
    const { data: billing } = await admin
      .from('vendor_billing')
      .select('subaccount_code')
      .eq('vendor_id', vendor.id)
      .maybeSingle();
    const existing = billing?.subaccount_code?.trim() ?? '';
    const code = existing.startsWith('ACCT_')
      ? existing
      : await createSubaccount({ businessName, bankCode, accountNumber: settlementNumber });
    if (existing.startsWith('ACCT_')) {
      await updateSubaccount({ code, businessName, bankCode, accountNumber: settlementNumber });
    }
    const { error: saveError } = await admin.from('vendor_billing').upsert({
      vendor_id: vendor.id,
      subaccount_code: code,
      updated_at: new Date().toISOString(),
    });
    if (saveError) return json({ error: 'could not save payout account' }, 500);
    const saved = await fetchSubaccount(code);
    return json({
      connected: true,
      account_name: saved.accountName ?? resolved?.accountName ?? null,
      bank_name: saved.bankName,
    });
  } catch (error) {
    const status = error instanceof PaystackApiError && error.status < 500 ? 400 : 502;
    const detail = error instanceof Error ? error.message.replace(/\d/g, '') : 'unknown';
    console.error('payout account failed', action, status, detail.slice(0, 120));
    if (action === 'banks') return json({ error: 'the bank list could not be loaded' }, status);
    if (action === 'resolve') return json({ error: 'that account could not be found' }, status);
    return json({ error: 'Paystack could not save that account' }, status);
  }
});

async function resolveAccount(
  accountNumber: string,
  bankCode: string,
): Promise<{ accountName: string; accountNumber: string } | null> {
  try {
    return await resolveBankAccount(accountNumber, bankCode);
  } catch (error) {
    const missed =
      error instanceof PaystackApiError && error.status >= 400 && error.status < 500 && error.status !== 401;
    if (missed && paystackUsesTestKey()) return null;
    throw error;
  }
}

async function payoutStatus(
  admin: SupabaseClient,
  vendorId: string,
): Promise<{ connected: boolean; account_name: string | null; bank_name: string | null }> {
  const { data, error } = await admin
    .from('vendor_billing')
    .select('subaccount_code')
    .eq('vendor_id', vendorId)
    .maybeSingle();
  if (error) throw new Error('could not read shop');
  const code = data?.subaccount_code?.trim() ?? '';
  if (!code.startsWith('ACCT_')) return { connected: false, account_name: null, bank_name: null };
  try {
    const saved = await fetchSubaccount(code);
    return { connected: true, account_name: saved.accountName, bank_name: saved.bankName };
  } catch {
    return { connected: true, account_name: null, bank_name: null };
  }
}
