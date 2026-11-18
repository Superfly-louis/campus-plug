import { supabase } from '@/lib/supabase';

export function raiseIfError(error: { message: string; details?: string | null; hint?: string | null } | null): void {
  if (!error) return;
  const parts = [error.message, error.details, error.hint].filter(
    (part): part is string => typeof part === 'string' && part.trim().length > 0,
  );
  throw new Error(parts.join(' ') || 'That request failed. Try again.');
}

export function requireData<T>(data: T | null): T {
  if (data == null) throw new Error('That request failed. Try again.');
  return data;
}

export async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  raiseIfError(error);
  const userId = data.session?.user.id;
  if (!userId) throw new Error('Sign in to continue.');
  return userId;
}
