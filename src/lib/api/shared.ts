import { supabase } from '@/lib/supabase';

export function raiseIfError(error: { message: string } | null): void {
  if (error) throw error;
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
