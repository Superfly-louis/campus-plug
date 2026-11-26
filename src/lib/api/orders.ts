import { limits } from '@/constants/theme';
import {
  statusesForFilter,
  type DbPaymentMethod,
  type DbPaymentStatus,
  type OrderListFilter,
} from '@/constants/orderStatus';
import { getImageUrl } from '@/lib/images';
import { supabase } from '@/lib/supabase';
import { orderSheetSchema, parseOrThrow } from '@/lib/validation';

import { raiseIfError, requireData, requireUserId } from '@/lib/api/shared';

import type { Database, Json, Tables } from '../../../types/database.types';

export type OrderRole = 'buyer' | 'vendor';
export type DbOrderStatus = Database['public']['Enums']['order_status'];

export type OrderSummary = {
  id: string;
  status: DbOrderStatus;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  buyerId: string | null;
  vendorId: string | null;
  vendorUserId: string | null;
  conversationId: string | null;
  buyerName: string;
  shopName: string;
  buyerNote: string | null;
  meetingPoint: string | null;
  paymentMethod: DbPaymentMethod;
  paymentStatus: DbPaymentStatus;
  paymentDueAt: string | null;
};

export type OrderListItem = OrderSummary & {
  vendorLogoUrl: string | null;
  itemCount: number;
  firstTitle: string;
  extraCount: number;
  imageUrl: string | null;
};

export type OrderLine = {
  id: string;
  productId: string | null;
  title: string;
  unitPrice: number;
  quantity: number;
  imageUrl: string | null;
};

export type OrderCounterpart = {
  kind: 'shop' | 'buyer';
  name: string | null;
  imageUrl: string | null;
};

export type OrderDetail = {
  order: OrderSummary;
  items: OrderLine[];
  conversationId: string | null;
  counterpart: OrderCounterpart;
};

export type CheckoutPaymentMethod = 'cash_on_delivery' | 'paystack';

export type PlaceOrderInput = {
  vendorId: string;
  items: { productId: string; quantity: number }[];
  meetingPoint: string;
  note: string;
  paymentMethod?: CheckoutPaymentMethod;
};

type ItemRow = {
  id: string;
  title_snapshot: string;
  quantity: number;
  unit_price: number;
  product_id: string | null;
  created_at: string;
};

type ShopEmbed = {
  shop_name: string;
  logo_url: string | null;
};

type ListedOrder = {
  id: string;
  status: DbOrderStatus;
  total_amount: number;
  created_at: string;
  updated_at: string;
  buyer_id: string | null;
  vendor_id: string | null;
  vendor_user_id: string | null;
  conversation_id: string | null;
  buyer_name_snapshot: string;
  shop_name_snapshot: string;
  buyer_note: string | null;
  meeting_point: string | null;
  payment_method: DbPaymentMethod;
  payment_status: DbPaymentStatus;
  payment_due_at: string | null;
  order_items: ItemRow[] | null;
  vendors: ShopEmbed | ShopEmbed[] | null;
};

const listColumns =
  'id, status, total_amount, created_at, updated_at, buyer_id, vendor_id, vendor_user_id, conversation_id, buyer_name_snapshot, shop_name_snapshot, buyer_note, meeting_point, payment_method, payment_status, payment_due_at, order_items(id, title_snapshot, quantity, unit_price, product_id, created_at), vendors(shop_name, logo_url)';

function shopOf(value: ShopEmbed | ShopEmbed[] | null): ShopEmbed | null {
  if (value == null) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

function toSummary(order: Tables<'orders'> | ListedOrder): OrderSummary {
  return {
    id: order.id,
    status: order.status,
    totalAmount: order.total_amount,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
    buyerId: order.buyer_id,
    vendorId: order.vendor_id,
    vendorUserId: order.vendor_user_id,
    conversationId: order.conversation_id,
    buyerName: order.buyer_name_snapshot,
    shopName: order.shop_name_snapshot,
    buyerNote: order.buyer_note,
    meetingPoint: order.meeting_point,
    paymentMethod: order.payment_method,
    paymentStatus: order.payment_status,
    paymentDueAt: order.payment_due_at,
  };
}

function sortedItems(items: readonly ItemRow[] | null): ItemRow[] {
  return [...(items ?? [])].sort(
    (left, right) => left.created_at.localeCompare(right.created_at) || left.id.localeCompare(right.id),
  );
}

async function firstImageByProduct(productIds: readonly string[]): Promise<Map<string, string>> {
  const unique = [...new Set(productIds)];
  const images = new Map<string, string>();
  if (unique.length === 0) return images;
  const { data, error } = await supabase
    .from('product_images')
    .select('product_id, storage_path, position')
    .in('product_id', unique)
    .order('position', { ascending: true });
  raiseIfError(error);
  for (const image of data ?? []) {
    if (!images.has(image.product_id)) images.set(image.product_id, image.storage_path);
  }
  return images;
}

export async function listOrders(role: OrderRole, filter: OrderListFilter, offset: number): Promise<OrderListItem[]> {
  const userId = await requireUserId();
  const statuses = statusesForFilter(filter);
  let request = supabase
    .from('orders')
    .select(listColumns)
    .order('created_at', { ascending: false })
    .range(offset, offset + limits.orderPageSize - 1);

  request = role === 'buyer' ? request.eq('buyer_id', userId) : request.eq('vendor_user_id', userId);
  if (statuses) request = request.in('status', [...statuses]);

  const { data, error } = await request;
  raiseIfError(error);
  const rows = (data ?? []) as ListedOrder[];
  const productIds = rows.flatMap((row) => sortedItems(row.order_items).map((item) => item.product_id ?? ''));
  const images = await firstImageByProduct(productIds.filter((id) => id.length > 0));

  return rows.map((row) => {
    const items = sortedItems(row.order_items);
    const first = items[0];
    const shop = shopOf(row.vendors);
    return {
      ...toSummary(row),
      vendorLogoUrl: getImageUrl('shop-logos', shop?.logo_url),
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      firstTitle: first?.title_snapshot ?? 'Order',
      extraCount: Math.max(items.length - 1, 0),
      imageUrl: getImageUrl('product-images', first?.product_id ? images.get(first.product_id) : null),
    };
  });
}

export async function getOrder(id: string): Promise<OrderDetail | null> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from('orders')
    .select(`${listColumns}`)
    .eq('id', id)
    .maybeSingle();
  raiseIfError(error);
  if (!data) return null;

  const row = data as ListedOrder;
  const items = sortedItems(row.order_items);
  const images = await firstImageByProduct(items.flatMap((item) => (item.product_id ? [item.product_id] : [])));
  const shop = shopOf(row.vendors);
  const isVendor = row.vendor_user_id === userId;
  let buyer: { full_name: string | null; avatar_url: string | null } | null = null;
  if (isVendor && row.buyer_id) {
    const profiles = await supabase
      .from('public_profiles')
      .select('full_name, avatar_url')
      .eq('id', row.buyer_id)
      .limit(1);
    raiseIfError(profiles.error);
    buyer = profiles.data?.[0] ?? null;
  }

  return {
    order: toSummary(row),
    items: items.map((item) => ({
      id: item.id,
      productId: item.product_id,
      title: item.title_snapshot,
      unitPrice: item.unit_price,
      quantity: item.quantity,
      imageUrl: getImageUrl('product-images', item.product_id ? images.get(item.product_id) : null),
    })),
    conversationId: row.conversation_id,
    counterpart: isVendor
      ? {
          kind: 'buyer',
          name: row.buyer_id ? (buyer?.full_name ?? null) : null,
          imageUrl: getImageUrl('avatars', buyer?.avatar_url),
        }
      : {
          kind: 'shop',
          name: shop?.shop_name ?? null,
          imageUrl: getImageUrl('shop-logos', shop?.logo_url),
        },
  };
}

export async function placeOrder(input: PlaceOrderInput): Promise<OrderSummary> {
  if (input.vendorId.trim().length === 0) throw new Error('Choose a shop.');
  const parsed = parseOrThrow(orderSheetSchema, {
    items: input.items,
    meetingPoint: input.meetingPoint,
    note: input.note,
  });
  const items: Json = parsed.items.map((item) => ({
    product_id: item.productId,
    quantity: item.quantity,
  }));
  const { data, error } = await supabase.rpc('place_order', {
    vendor_id: input.vendorId,
    items,
    buyer_note: parsed.note ?? '',
    meeting_point: parsed.meetingPoint,
    p_payment_method: input.paymentMethod ?? 'cash_on_delivery',
  });
  raiseIfError(error);
  return toSummary(requireData(data));
}

export async function updateOrderStatus(orderId: string, status: DbOrderStatus): Promise<OrderSummary> {
  const { data, error } = await supabase.rpc('update_order_status', {
    order_id: orderId,
    new_status: status,
  });
  raiseIfError(error);
  return toSummary(requireData(data));
}

export async function incomingPendingCount(): Promise<number> {
  const userId = await requireUserId();
  const { count, error } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('vendor_user_id', userId)
    .eq('status', 'pending');
  raiseIfError(error);
  return count ?? 0;
}
