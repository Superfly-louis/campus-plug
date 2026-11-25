import { supabase } from '@/lib/supabase';
import { parseOrThrow, reviewBodySchema, reviewRatingSchema } from '@/lib/validation';

import { raiseIfError } from '@/lib/api/shared';

export type ShopReview = {
  id: string;
  buyerName: string;
  rating: number;
  body: string | null;
  createdAt: string;
};

export type ShopReviewSummary = {
  rating: number;
  reviewCount: number;
};

export type OrderReview = {
  id: string;
  rating: number;
  body: string | null;
  createdAt: string;
};

function missingSetup(message: string): boolean {
  const text = message.toLowerCase();
  return text.includes('schema cache') || text.includes('could not find the function');
}

export async function listShopReviews(vendorId: string): Promise<ShopReview[]> {
  const { data, error } = await supabase.rpc('list_shop_reviews', { vendor_id: vendorId });
  if (error) {
    if (missingSetup(error.message)) return [];
    raiseIfError(error);
  }
  return (data ?? []).map((row) => ({
    id: row.id,
    buyerName: row.buyer_name,
    rating: row.rating,
    body: row.body,
    createdAt: row.created_at,
  }));
}

export async function shopReviewSummaries(): Promise<Record<string, ShopReviewSummary>> {
  const { data, error } = await supabase.rpc('shop_review_summaries');
  if (error) {
    if (missingSetup(error.message)) return {};
    raiseIfError(error);
  }
  const summaries: Record<string, ShopReviewSummary> = {};
  for (const row of data ?? []) {
    const count = Number(row.review_count);
    if (!row.vendor_id || count < 1) continue;
    summaries[row.vendor_id] = {
      rating: Number(row.rating_avg),
      reviewCount: count,
    };
  }
  return summaries;
}

export async function getOrderReview(orderId: string): Promise<OrderReview | null> {
  const { data, error } = await supabase.rpc('order_review', { order_id: orderId });
  if (error) {
    if (missingSetup(error.message)) return null;
    raiseIfError(error);
  }
  const row = data?.[0];
  if (!row) return null;
  return {
    id: row.id,
    rating: row.rating,
    body: row.body,
    createdAt: row.created_at,
  };
}

export async function submitOrderReview(orderId: string, rating: number, body: string): Promise<void> {
  const { error } = await supabase.rpc('submit_order_review', {
    order_id: orderId,
    rating: parseOrThrow(reviewRatingSchema, rating),
    body: parseOrThrow(reviewBodySchema, body),
  });
  raiseIfError(error);
}
