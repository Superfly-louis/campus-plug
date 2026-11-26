import { supabase } from '@/lib/supabase';

import { requireUserId } from '@/lib/api/shared';

export type PayoutBank = {
  name: string;
  code: string;
};

export type ResolvedPayout = {
  accountName: string | null;
  accountNumber: string;
  unconfirmed: boolean;
};

export type PayoutStatus = {
  connected: boolean;
  accountName: string | null;
  bankName: string | null;
};

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

async function invoke(body: Record<string, unknown>): Promise<unknown> {
  await requireUserId();
  const { data, error } = await supabase.functions.invoke('payout-account', { body });
  if (error) throw new Error(await functionError(error));
  return data;
}

function readRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null) return null;
  return value as Record<string, unknown>;
}

function readStatus(value: unknown): PayoutStatus {
  const body = readRecord(value);
  return {
    connected: body?.connected === true,
    accountName: typeof body?.account_name === 'string' && body.account_name.length > 0 ? body.account_name : null,
    bankName: typeof body?.bank_name === 'string' && body.bank_name.length > 0 ? body.bank_name : null,
  };
}

export async function getPayoutStatus(): Promise<PayoutStatus> {
  return readStatus(await invoke({ action: 'status' }));
}

export async function listPayoutBanks(): Promise<PayoutBank[]> {
  const body = readRecord(await invoke({ action: 'banks' }));
  const banks = body?.banks;
  if (!Array.isArray(banks)) throw new Error('the bank list could not be loaded');
  return banks.flatMap((bank) => {
    const row = readRecord(bank);
    const name = row?.name;
    const code = row?.code;
    if (typeof name !== 'string' || typeof code !== 'string' || name.length === 0 || code.length === 0) return [];
    return [{ name, code }];
  });
}

export async function resolvePayoutAccount(bankCode: string, accountNumber: string): Promise<ResolvedPayout> {
  const body = readRecord(await invoke({ action: 'resolve', bank_code: bankCode, account_number: accountNumber }));
  const name = typeof body?.account_name === 'string' && body.account_name.length > 0 ? body.account_name : null;
  const returnedNumber = body?.account_number;
  const number =
    typeof returnedNumber === 'string' && /^[0-9]{10,16}$/.test(returnedNumber) ? returnedNumber : accountNumber;
  const unconfirmed = body?.unconfirmed === true && name == null;
  if (!name && !unconfirmed) throw new Error('that account could not be found');
  return { accountName: name, accountNumber: number, unconfirmed };
}

export async function connectPayoutAccount(
  bankCode: string,
  accountNumber: string,
  accountName: string,
): Promise<PayoutStatus> {
  return readStatus(
    await invoke({
      action: 'connect',
      bank_code: bankCode,
      account_number: accountNumber,
      account_name: accountName,
    }),
  );
}
