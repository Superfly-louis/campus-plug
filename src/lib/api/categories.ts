import { supabase } from '@/lib/supabase';

import { raiseIfError } from '@/lib/api/shared';

import type { Tables } from '../../../types/database.types';

export type Category = Tables<'categories'>;

export async function listCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });
  raiseIfError(error);
  return data ?? [];
}
