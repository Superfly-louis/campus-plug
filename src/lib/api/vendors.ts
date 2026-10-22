import { supabase } from '@/lib/supabase';
import { parseOrThrow, shopDescriptionSchema, shopNameSchema } from '@/lib/validation';

import { raiseIfError, requireData, requireUserId } from '@/lib/api/shared';

import type { Tables, TablesUpdate } from '../../../types/database.types';

export type Vendor = Tables<'vendors'>;

export type CreateVendorInput = {
  shopName: string;
  description: string;
  logoUrl?: string | null;
};

export type UpdateShopInput = {
  shopName?: string;
  description?: string;
  logoUrl?: string | null;
  isPaused?: boolean;
};

export async function getOwnVendor(): Promise<Vendor | null> {
  const ownerId = await requireUserId();
  const { data, error } = await supabase.from('vendors').select('*').eq('owner_id', ownerId).maybeSingle();
  raiseIfError(error);
  return data;
}

export async function listPublicVendors(): Promise<Vendor[]> {
  const { data, error } = await supabase
    .from('vendors')
    .select('*')
    .eq('status', 'approved')
    .eq('is_paused', false)
    .order('created_at', { ascending: false });
  raiseIfError(error);
  return data ?? [];
}

export async function getVendor(id: string): Promise<Vendor | null> {
  const { data, error } = await supabase.from('vendors').select('*').eq('id', id).maybeSingle();
  raiseIfError(error);
  return data;
}

export async function createVendor(input: CreateVendorInput): Promise<Vendor> {
  const ownerId = await requireUserId();
  const shopName = parseOrThrow(shopNameSchema, input.shopName);
  const description = parseOrThrow(shopDescriptionSchema, input.description);
  const { data, error } = await supabase
    .from('vendors')
    .insert({
      owner_id: ownerId,
      shop_name: shopName,
      description,
      logo_url: input.logoUrl ? input.logoUrl : null,
      status: 'pending',
    })
    .select('*')
    .single();
  raiseIfError(error);
  return requireData(data);
}

export async function updateShop(input: UpdateShopInput): Promise<Vendor> {
  const ownerId = await requireUserId();
  const patch: TablesUpdate<'vendors'> = {};
  if (input.shopName !== undefined) patch.shop_name = parseOrThrow(shopNameSchema, input.shopName);
  if (input.description !== undefined) patch.description = parseOrThrow(shopDescriptionSchema, input.description);
  if (input.logoUrl !== undefined) patch.logo_url = input.logoUrl ? input.logoUrl : null;
  if (input.isPaused !== undefined) patch.is_paused = input.isPaused;
  if (Object.keys(patch).length === 0) throw new Error('Nothing to update.');

  const { data, error } = await supabase
    .from('vendors')
    .update(patch)
    .eq('owner_id', ownerId)
    .select('*')
    .single();
  raiseIfError(error);
  return requireData(data);
}
