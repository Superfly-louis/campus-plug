import { supabase } from '@/lib/supabase';
import {
  categoryIdSchema,
  parseOrThrow,
  requestBodySchema,
  requestOfferSchema,
  requestRemovalSchema,
  requestTitleSchema,
} from '@/lib/validation';

import { raiseIfError, requireData } from '@/lib/api/shared';

export type BuyerRequestStatus = 'open' | 'closed' | 'removed';

export type BuyerRequest = {
  id: string;
  buyerId: string;
  buyerName: string;
  campus: string;
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  title: string;
  body: string | null;
  targetVendorId: string | null;
  targetShopName: string | null;
  status: BuyerRequestStatus;
  offerCount: number;
  mine: boolean;
  offered: boolean;
  createdAt: string;
  removalReason: string | null;
};

export type RequestOffer = {
  id: string;
  vendorId: string;
  shopName: string;
  note: string;
  conversationId: string;
  createdAt: string;
};

export type CampusShop = {
  id: string;
  shopName: string;
};

type RequestRow = {
  id: string;
  buyer_id: string;
  buyer_name: string;
  campus: string;
  category_id: string;
  category_name: string;
  category_slug: string;
  title: string;
  body: string | null;
  target_vendor_id: string | null;
  target_shop_name: string | null;
  status: string;
  offer_count: number;
  mine: boolean;
  offered: boolean;
  created_at: string;
  removal_reason: string | null;
};

function missingSetup(message: string): boolean {
  const text = message.toLowerCase();
  return text.includes('schema cache') || text.includes('could not find the function');
}

function requestStatus(value: string): BuyerRequestStatus {
  if (value === 'closed' || value === 'removed') return value;
  return 'open';
}

function mapRequest(row: RequestRow): BuyerRequest {
  return {
    id: row.id,
    buyerId: row.buyer_id,
    buyerName: row.buyer_name,
    campus: row.campus,
    categoryId: row.category_id,
    categoryName: row.category_name,
    categorySlug: row.category_slug,
    title: row.title,
    body: row.body,
    targetVendorId: row.target_vendor_id,
    targetShopName: row.target_shop_name,
    status: requestStatus(row.status),
    offerCount: Number(row.offer_count),
    mine: row.mine,
    offered: row.offered,
    createdAt: row.created_at,
    removalReason: row.removal_reason,
  };
}

export async function listMyRequests(): Promise<BuyerRequest[]> {
  const { data, error } = await supabase.rpc('list_my_requests');
  if (error) {
    if (missingSetup(error.message)) return [];
    raiseIfError(error);
  }
  return (data ?? []).map(mapRequest);
}

export async function listCampusRequests(categoryId: string | null): Promise<BuyerRequest[]> {
  const { data, error } = await supabase.rpc(
    'list_campus_requests',
    categoryId ? { filter_category_id: categoryId } : {},
  );
  if (error) {
    if (missingSetup(error.message)) return [];
    raiseIfError(error);
  }
  return (data ?? []).map(mapRequest);
}

export async function listCampusShops(): Promise<CampusShop[]> {
  const { data, error } = await supabase.rpc('list_campus_shops');
  if (error) {
    if (missingSetup(error.message)) return [];
    raiseIfError(error);
  }
  return (data ?? []).map((row) => ({ id: row.id, shopName: row.shop_name }));
}

export async function getBuyerRequest(requestId: string): Promise<BuyerRequest | null> {
  const { data, error } = await supabase.rpc('get_buyer_request', { request_id: requestId });
  if (error) {
    if (missingSetup(error.message)) return null;
    raiseIfError(error);
  }
  const row = data?.[0];
  return row ? mapRequest(row) : null;
}

export async function listRequestOffers(requestId: string): Promise<RequestOffer[]> {
  const { data, error } = await supabase.rpc('list_request_offers', { request_id: requestId });
  if (error) {
    if (missingSetup(error.message)) return [];
    raiseIfError(error);
  }
  return (data ?? []).map((row) => ({
    id: row.id,
    vendorId: row.vendor_id,
    shopName: row.shop_name,
    note: row.note,
    conversationId: row.conversation_id,
    createdAt: row.created_at,
  }));
}

export async function createBuyerRequest(input: {
  title: string;
  body: string;
  categoryId: string;
  vendorId?: string | null;
}): Promise<string> {
  const title = parseOrThrow(requestTitleSchema, input.title);
  const body = parseOrThrow(requestBodySchema, input.body);
  const categoryId = parseOrThrow(categoryIdSchema, input.categoryId);
  const { data, error } = await supabase.rpc('create_buyer_request', {
    title,
    category_id: categoryId,
    ...(body ? { body } : {}),
    ...(input.vendorId ? { vendor_id: input.vendorId } : {}),
  });
  raiseIfError(error);
  return requireData(data);
}

export async function closeBuyerRequest(requestId: string): Promise<void> {
  const { error } = await supabase.rpc('close_buyer_request', { request_id: requestId });
  raiseIfError(error);
}

export async function offerOnRequest(requestId: string, note: string): Promise<string> {
  const { data, error } = await supabase.rpc('offer_on_request', {
    request_id: requestId,
    note: parseOrThrow(requestOfferSchema, note),
  });
  raiseIfError(error);
  return requireData(data);
}

export async function removeBuyerRequest(requestId: string, reason: string): Promise<void> {
  const { error } = await supabase.rpc('admin_remove_request', {
    request_id: requestId,
    reason: parseOrThrow(requestRemovalSchema, reason),
  });
  raiseIfError(error);
}
