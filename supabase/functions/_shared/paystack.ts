const paystackApi = 'https://api.paystack.co';

export type PaystackCustomer = {
  customer_code?: string;
  email?: string;
};

export type PaystackPlan = {
  plan_code?: string;
};

export type PaystackFeesSplit = {
  paystack?: number;
  integration?: number;
  subaccount?: number;
};

export class PaystackApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export type PaystackEvent = {
  event?: string;
  data?: {
    reference?: string;
    status?: string;
    paid_at?: string;
    paid?: boolean;
    amount?: number;
    currency?: string;
    channel?: string;
    fees_split?: PaystackFeesSplit | null;
    transaction_reference?: string;
    refund_reference?: string;
    metadata?: { vendor_id?: string; order_id?: string } | null;
    customer?: PaystackCustomer;
    plan?: PaystackPlan | string | null;
    plan_object?: PaystackPlan | null;
    subscription_code?: string;
    next_payment_date?: string;
    subscription?: {
      subscription_code?: string;
      next_payment_date?: string;
    } | null;
  };
};

export function paystackSecret(): string | null {
  const secret = Deno.env.get('PAYSTACK_SECRET_KEY');
  return secret && secret.trim().length > 0 ? secret.trim() : null;
}

export function paystackUsesTestKey(): boolean {
  return paystackSecret()?.startsWith('sk_test_') === true;
}

export function paystackPlanCode(): string | null {
  const plan = Deno.env.get('PAYSTACK_PLAN_CODE');
  return plan && plan.trim().length > 0 ? plan.trim() : null;
}

export async function paystackRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const secret = paystackSecret();
  if (!secret) throw new Error('verification checkout is not set up yet');

  const response = await fetch(`${paystackApi}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  const payload = (await response.json()) as { status?: boolean; message?: string; data?: T };
  if (!response.ok || payload.status === false) {
    throw new PaystackApiError(payload.message || 'Paystack request failed', response.status);
  }
  if (payload.data == null) throw new PaystackApiError('Paystack request failed', response.status);
  return payload.data;
}

export function ghsToPesewas(amount: string | number): number {
  const text = String(amount).trim();
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(text);
  if (!match) throw new Error('order total is not valid');
  const pesewas = Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'));
  if (!Number.isSafeInteger(pesewas) || pesewas <= 0) throw new Error('order total is not valid');
  return pesewas;
}

export function platformFeePesewas(amountPesewas: number, percent: number): number {
  if (!Number.isInteger(amountPesewas) || amountPesewas <= 0) throw new Error('order total is not valid');
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) throw new Error('online payments are not configured');
  return Math.round((amountPesewas * percent) / 100);
}

const paystackFeeBasisPoints = 195;

export function paystackProcessingPesewas(chargePesewas: number): number {
  if (!Number.isInteger(chargePesewas) || chargePesewas <= 0) throw new Error('order total is not valid');
  return Math.round((chargePesewas * paystackFeeBasisPoints) / 10000);
}

export type InitializedTransaction = {
  authorization_url?: string;
  access_code?: string;
  reference?: string;
};

export async function initializeTransaction(input: {
  email: string;
  amountPesewas: number;
  reference: string;
  subaccount: string;
  transactionChargePesewas: number;
  callbackUrl?: string;
  orderId: string;
}): Promise<InitializedTransaction> {
  const body: Record<string, unknown> = {
    email: input.email,
    amount: String(input.amountPesewas),
    currency: 'GHS',
    reference: input.reference,
    subaccount: input.subaccount,
    bearer: 'subaccount',
    metadata: { order_id: input.orderId },
  };
  if (input.transactionChargePesewas > 0) body.transaction_charge = input.transactionChargePesewas;
  if (input.callbackUrl) body.callback_url = input.callbackUrl;
  return await paystackRequest<InitializedTransaction>('/transaction/initialize', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export type VerifiedTransaction = {
  status?: string;
  reference?: string;
  amount?: number;
  currency?: string;
  channel?: string;
  fees_split?: PaystackFeesSplit | null;
  metadata?: { order_id?: string } | null;
};

export async function verifyTransaction(reference: string): Promise<VerifiedTransaction> {
  return await paystackRequest<VerifiedTransaction>(`/transaction/verify/${encodeURIComponent(reference)}`);
}

export type PayoutBank = {
  name: string;
  code: string;
};

export async function listGhsBanks(): Promise<PayoutBank[]> {
  for (const currency of ['GHS', '']) {
    try {
      const banks = await collectGhsBanks(currency);
      if (banks.length > 0) return banks;
    } catch {
      // A currency filter can be rejected. The unfiltered Ghana list is the fallback.
    }
  }
  return [];
}

async function collectGhsBanks(currency: string): Promise<PayoutBank[]> {
  const banks = new Map<string, string>();
  for (let page = 1; page <= 3; page += 1) {
    const currencyQuery = currency.length > 0 ? `&currency=${currency}` : '';
    const batch = await paystackRequest<{ name?: string; code?: string }[]>(
      `/bank?country=ghana${currencyQuery}&perPage=100&page=${page}`,
    );
    if (!Array.isArray(batch) || batch.length === 0) break;
    for (const bank of batch) {
      const name = bank.name?.trim() ?? '';
      const code = bank.code?.trim() ?? '';
      if (name.length > 0 && code.length > 0) banks.set(code, name);
    }
    if (batch.length < 100) break;
  }
  return [...banks.entries()]
    .map(([code, name]) => ({ code, name }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

export async function resolveBankAccount(
  accountNumber: string,
  bankCode: string,
): Promise<{ accountName: string; accountNumber: string }> {
  const candidates = [accountNumber];
  if (/^0\d{9}$/.test(accountNumber)) candidates.push(`233${accountNumber.slice(1)}`);
  let lastError: unknown = new PaystackApiError('could not resolve account', 400);
  for (const candidate of candidates) {
    try {
      const resolved = await paystackRequest<{ account_name?: string; account_number?: string }>(
        `/bank/resolve?account_number=${encodeURIComponent(candidate)}&bank_code=${encodeURIComponent(bankCode)}`,
      );
      const name = resolved.account_name?.trim() ?? '';
      if (name.length === 0) throw new PaystackApiError('could not resolve account', 400);
      const number = resolved.account_number?.replace(/\s+/g, '') ?? '';
      return {
        accountName: name,
        accountNumber: /^[0-9]{10,16}$/.test(number) ? number : candidate,
      };
    } catch (error) {
      lastError = error;
      const retry = error instanceof PaystackApiError && error.status >= 400 && error.status < 500 && error.status !== 401;
      if (!retry || candidate === candidates[candidates.length - 1]) break;
    }
  }
  throw lastError;
}

export async function createSubaccount(input: {
  businessName: string;
  bankCode: string;
  accountNumber: string;
}): Promise<string> {
  const created = await paystackRequest<{ subaccount_code?: string }>('/subaccount', {
    method: 'POST',
    body: JSON.stringify({
      business_name: input.businessName,
      settlement_bank: input.bankCode,
      account_number: input.accountNumber,
      percentage_charge: 0,
    }),
  });
  const code = created.subaccount_code?.trim() ?? '';
  if (!code.startsWith('ACCT_') || code.length > 80) throw new PaystackApiError('Paystack request failed', 502);
  return code;
}

export async function updateSubaccount(input: {
  code: string;
  businessName: string;
  bankCode: string;
  accountNumber: string;
}): Promise<void> {
  await paystackRequest<unknown>(`/subaccount/${encodeURIComponent(input.code)}`, {
    method: 'PUT',
    body: JSON.stringify({
      business_name: input.businessName,
      bank_code: input.bankCode,
      account_number: input.accountNumber,
      percentage_charge: 0,
    }),
  });
}

export async function fetchSubaccount(code: string): Promise<{ accountName: string | null; bankName: string | null }> {
  const details = await paystackRequest<{ account_name?: string; settlement_bank?: string }>(
    `/subaccount/${encodeURIComponent(code)}`,
  );
  const accountName = details.account_name?.trim() ?? '';
  const bankName = details.settlement_bank?.trim() ?? '';
  return {
    accountName: accountName.length > 0 ? accountName : null,
    bankName: bankName.length > 0 ? bankName : null,
  };
}

const signatureToleranceSeconds = 300;

export async function webhookSignatureIsValid(rawBody: string, req: Request): Promise<boolean> {
  const modern = req.headers.get('paystack-signature');
  if (modern) {
    const signingSecret = Deno.env.get('PAYSTACK_WEBHOOK_SIGNING_SECRET')?.trim() ?? '';
    if (!signingSecret) return false;
    return await modernSignatureMatches(rawBody, modern, signingSecret);
  }

  const legacy = req.headers.get('x-paystack-signature') ?? '';
  const secret = paystackSecret();
  if (!secret || !legacy) return false;
  const expected = await paystackSignature(secret, rawBody);
  return signaturesMatch(expected, legacy);
}

async function modernSignatureMatches(rawBody: string, header: string, secret: string): Promise<boolean> {
  let signedAt: number | null = null;
  const signatures: string[] = [];
  for (const part of header.split(',')) {
    const splitAt = part.indexOf('=');
    if (splitAt === -1) continue;
    const key = part.slice(0, splitAt).trim();
    const value = part.slice(splitAt + 1).trim();
    if (key === 't') {
      if (signedAt !== null || !/^[0-9]+$/.test(value)) return false;
      signedAt = Number(value);
    } else if (key === 'v1') {
      const colon = value.indexOf(':');
      if (colon !== -1) signatures.push(value.slice(colon + 1));
    }
  }
  if (signedAt === null || signatures.length === 0) return false;
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - signedAt) > signatureToleranceSeconds) return false;

  const expected = await hmacSha512Bytes(secret, `${signedAt}.${rawBody}`);
  for (const hex of signatures) {
    const received = hexToBytes(hex);
    if (received && bytesMatch(expected, received)) return true;
  }
  return false;
}

async function hmacSha512Bytes(secret: string, message: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign'],
  );
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return new Uint8Array(mac);
}

function hexToBytes(hex: string): Uint8Array | null {
  const text = hex.trim().toLowerCase();
  if (!/^[0-9a-f]{128}$/.test(text)) return null;
  const bytes = new Uint8Array(64);
  for (let index = 0; index < 64; index += 1) {
    bytes[index] = Number.parseInt(text.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

function bytesMatch(expected: Uint8Array, received: Uint8Array): boolean {
  if (expected.length !== received.length) return false;
  let mismatch = 0;
  for (let index = 0; index < expected.length; index += 1) {
    mismatch |= expected[index] ^ received[index];
  }
  return mismatch === 0;
}

export async function paystackSignature(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign'],
  );
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(mac))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export function signaturesMatch(expected: string, received: string): boolean {
  const left = expected.trim().toLowerCase();
  const right = received.trim().toLowerCase();
  if (left.length === 0 || left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
}

export function planCodeOf(event: PaystackEvent): string | null {
  const plan = event.data?.plan;
  if (typeof plan === 'string' && plan.length > 0) return plan;
  if (plan && typeof plan === 'object' && plan.plan_code) return plan.plan_code;
  return event.data?.plan_object?.plan_code ?? null;
}

export function graceUntil(periodEnd: string): string | null {
  const date = new Date(periodEnd);
  if (Number.isNaN(date.getTime())) return null;
  date.setUTCDate(date.getUTCDate() + 3);
  return date.toISOString();
}

export function monthPlusGrace(paidAt: string): string | null {
  const date = new Date(paidAt);
  if (Number.isNaN(date.getTime())) return null;
  date.setUTCMonth(date.getUTCMonth() + 1);
  date.setUTCDate(date.getUTCDate() + 3);
  return date.toISOString();
}
