import { limits } from '@/constants/theme';
import { getImageUrl } from '@/lib/images';
import { supabase } from '@/lib/supabase';

import { raiseIfError, requireData, requireUserId } from '@/lib/api/shared';

type ShopEmbed = {
  shop_name: string;
  logo_url: string | null;
};

type ConversationRow = {
  id: string;
  buyer_id: string;
  vendor_id: string;
  vendor_user_id: string;
  last_message_at: string | null;
  vendors: ShopEmbed | ShopEmbed[] | null;
};

export type ConversationSummary = {
  id: string;
  buyerId: string;
  vendorId: string;
  vendorUserId: string;
  lastMessageAt: string | null;
  role: 'buyer' | 'vendor';
  counterpartName: string | null;
  counterpartImageUrl: string | null;
  counterpartKind: 'shop' | 'buyer';
  preview: string | null;
  unreadCount: number;
};

function shopOf(value: ShopEmbed | ShopEmbed[] | null): ShopEmbed | null {
  if (value == null) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

/**
 * Previews come from the newest 100 visible messages, keeping the latest row per
 * conversation. A database view would scale better than this client-side sample.
 */
export async function listConversations(): Promise<ConversationSummary[]> {
  const userId = await requireUserId();
  const columns = 'id, buyer_id, vendor_id, vendor_user_id, last_message_at, vendors(shop_name, logo_url)';
  const [asBuyer, asVendor] = await Promise.all([
    supabase.from('conversations').select(columns).eq('buyer_id', userId),
    supabase.from('conversations').select(columns).eq('vendor_user_id', userId),
  ]);
  raiseIfError(asBuyer.error);
  raiseIfError(asVendor.error);

  const byId = new Map<string, ConversationRow>();
  for (const row of [...(asBuyer.data ?? []), ...(asVendor.data ?? [])]) byId.set(row.id, row);
  const rows = [...byId.values()].sort((left, right) => {
    if (left.last_message_at == null && right.last_message_at == null) return 0;
    if (left.last_message_at == null) return 1;
    if (right.last_message_at == null) return -1;
    return right.last_message_at.localeCompare(left.last_message_at);
  });

  const buyerIds = [...new Set(rows.filter((row) => row.vendor_user_id === userId).map((row) => row.buyer_id))];
  const profiles = new Map<string, { full_name: string | null; avatar_url: string | null }>();
  if (buyerIds.length > 0) {
    const { data, error } = await supabase
      .from('public_profiles')
      .select('id, full_name, avatar_url')
      .in('id', buyerIds);
    raiseIfError(error);
    for (const profile of data ?? []) {
      if (profile.id) profiles.set(profile.id, profile);
    }
  }

  const { data: recent, error: recentError } = await supabase
    .from('messages')
    .select('conversation_id, body, created_at')
    .order('created_at', { ascending: false })
    .limit(limits.conversationPreviewSample);
  raiseIfError(recentError);
  const previewByConversation = new Map<string, string>();
  for (const message of recent ?? []) {
    if (!previewByConversation.has(message.conversation_id)) {
      previewByConversation.set(message.conversation_id, message.body);
    }
  }

  const { data: unread, error: unreadError } = await supabase
    .from('messages')
    .select('conversation_id')
    .is('read_at', null)
    .neq('sender_id', userId);
  raiseIfError(unreadError);
  const unreadCount = new Map<string, number>();
  for (const message of unread ?? []) {
    unreadCount.set(message.conversation_id, (unreadCount.get(message.conversation_id) ?? 0) + 1);
  }

  return rows.map((row) => {
    const asShop = row.buyer_id === userId;
    const shop = shopOf(row.vendors);
    const buyer = profiles.get(row.buyer_id);
    return {
      id: row.id,
      buyerId: row.buyer_id,
      vendorId: row.vendor_id,
      vendorUserId: row.vendor_user_id,
      lastMessageAt: row.last_message_at,
      role: asShop ? 'buyer' : 'vendor',
      counterpartName: asShop ? (shop?.shop_name ?? null) : (buyer?.full_name ?? null),
      counterpartImageUrl: asShop
        ? getImageUrl('shop-logos', shop?.logo_url)
        : getImageUrl('avatars', buyer?.avatar_url),
      counterpartKind: asShop ? 'shop' : 'buyer',
      preview: previewByConversation.get(row.id) ?? null,
      unreadCount: unreadCount.get(row.id) ?? 0,
    };
  });
}

export async function openConversation(vendorId: string): Promise<string> {
  const { data, error } = await supabase.rpc('get_or_create_conversation', { vendor_id: vendorId });
  raiseIfError(error);
  return requireData(data);
}

export async function markConversationRead(conversationId: string): Promise<void> {
  const { error } = await supabase.rpc('mark_conversation_read', { conversation_id: conversationId });
  raiseIfError(error);
}
