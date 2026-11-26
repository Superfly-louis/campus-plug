import { supabase } from '@/lib/supabase';

import { requireUserId } from '@/lib/api/shared';

async function edgeErrorMessage(error: unknown): Promise<string> {
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
  return 'verification checkout failed';
}

export async function startVerificationCheckout(): Promise<string> {
  await requireUserId();
  const { data, error } = await supabase.functions.invoke('paystack-checkout', { body: {} });
  if (error) throw new Error(await edgeErrorMessage(error));
  const url =
    typeof data === 'object' && data !== null && 'authorization_url' in data
      ? (data as { authorization_url?: unknown }).authorization_url
      : null;
  if (typeof url !== 'string' || url.length === 0) throw new Error('Paystack request failed');
  return url;
}
