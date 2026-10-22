import { limits } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

import { raiseIfError, requireUserId } from '@/lib/api/shared';

import type { Database, Json } from '../../../types/database.types';

export type AdminVendorStatus = Database['public']['Enums']['vendor_status'];
export type ProductModerationStatus = Database['public']['Enums']['product_status'];
export type AdminProductStatus = ProductModerationStatus | 'all';
export type VendorDecision = 'approved' | 'rejected';

export type AdminVendor = {
  id: string;
  shopName: string;
  description: string | null;
  logoUrl: string | null;
  status: AdminVendorStatus;
  rejectionReason: string | null;
  ownerId: string;
  ownerName: string | null;
  ownerAvatarUrl: string | null;
  createdAt: string;
  isPaused: boolean;
  reviewedAt: string | null;
};

export type AdminProduct = {
  id: string;
  title: string;
  price: number;
  status: ProductModerationStatus;
  moderationReason: string | null;
  isAvailable: boolean;
  vendorId: string;
  shopName: string;
  createdAt: string;
};

export type AuditEntry = {
  id: string;
  action: string;
  targetType: string;
  targetId: string | null;
  metadata: Json;
  createdAt: string;
  adminId: string | null;
  adminName: string | null;
};

type VendorRow = {
  id: string;
  shop_name: string;
  description: string | null;
  logo_url: string | null;
  status: AdminVendorStatus;
  rejection_reason: string | null;
  owner_id: string;
  created_at: string;
  is_paused: boolean;
  reviewed_at: string | null;
};

type ProductRow = {
  id: string;
  title: string;
  price: number;
  status: ProductModerationStatus;
  moderation_reason: string | null;
  is_available: boolean;
  vendor_id: string;
  created_at: string;
  vendors: { shop_name: string } | { shop_name: string }[] | null;
};

type AuditRow = {
  id: string;
  action: string;
  target_type: string;
  target_id: string | null;
  metadata: Json;
  created_at: string;
  admin_id: string | null;
};

const vendorColumns =
  'id, shop_name, description, logo_url, status, rejection_reason, owner_id, created_at, is_paused, reviewed_at';
const productColumns =
  'id, title, price, status, moderation_reason, is_available, vendor_id, created_at, vendors(shop_name)';
const auditColumns = 'id, action, target_type, target_id, metadata, created_at, admin_id';

function reasonOrThrow(value: string, requiredMessage: string | null): string {
  const trimmed = value.trim();
  if (requiredMessage && trimmed.length === 0) throw new Error(requiredMessage);
  if (trimmed.length > limits.moderationReasonMax) throw new Error('reason is too long');
  return trimmed;
}

function shopName(vendor: ProductRow['vendors']): string {
  if (!vendor) return '';
  if (Array.isArray(vendor)) return vendor[0]?.shop_name ?? '';
  return vendor.shop_name;
}

type PublicPerson = { fullName: string | null; avatarUrl: string | null };

async function peopleById(ids: string[]): Promise<Map<string, PublicPerson>> {
  const unique = [...new Set(ids)];
  const people = new Map<string, PublicPerson>();
  if (unique.length === 0) return people;
  const { data, error } = await supabase.from('public_profiles').select('id, full_name, avatar_url').in('id', unique);
  raiseIfError(error);
  for (const profile of data ?? []) {
    if (profile.id) people.set(profile.id, { fullName: profile.full_name, avatarUrl: profile.avatar_url });
  }
  return people;
}

export async function listAdminVendors(status: AdminVendorStatus, offset: number): Promise<AdminVendor[]> {
  await requireUserId();
  const { data, error } = await supabase
    .from('vendors')
    .select(vendorColumns)
    .eq('status', status)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(offset, offset + limits.adminPageSize - 1);
  raiseIfError(error);
  const rows = (data ?? []) as VendorRow[];
  const people = await peopleById(rows.map((row) => row.owner_id));
  return rows.map((row) => ({
    id: row.id,
    shopName: row.shop_name,
    description: row.description,
    logoUrl: row.logo_url,
    status: row.status,
    rejectionReason: row.rejection_reason,
    ownerId: row.owner_id,
    ownerName: people.get(row.owner_id)?.fullName ?? null,
    ownerAvatarUrl: people.get(row.owner_id)?.avatarUrl ?? null,
    createdAt: row.created_at,
    isPaused: row.is_paused,
    reviewedAt: row.reviewed_at,
  }));
}

export async function listAdminProducts(status: AdminProductStatus, offset: number): Promise<AdminProduct[]> {
  await requireUserId();
  let query = supabase
    .from('products')
    .select(productColumns)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false });
  if (status !== 'all') query = query.eq('status', status);
  const { data, error } = await query.range(offset, offset + limits.adminPageSize - 1);
  raiseIfError(error);
  return ((data ?? []) as ProductRow[]).map((row) => ({
    id: row.id,
    title: row.title,
    price: row.price,
    status: row.status,
    moderationReason: row.moderation_reason,
    isAvailable: row.is_available,
    vendorId: row.vendor_id,
    shopName: shopName(row.vendors),
    createdAt: row.created_at,
  }));
}

export async function listAuditLog(offset: number): Promise<AuditEntry[]> {
  await requireUserId();
  const { data, error } = await supabase
    .from('admin_audit_log')
    .select(auditColumns)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(offset, offset + limits.adminPageSize - 1);
  raiseIfError(error);
  const rows = (data ?? []) as AuditRow[];
  const people = await peopleById(rows.flatMap((row) => (row.admin_id ? [row.admin_id] : [])));
  return rows.map((row) => ({
    id: row.id,
    action: row.action,
    targetType: row.target_type,
    targetId: row.target_id,
    metadata: row.metadata,
    createdAt: row.created_at,
    adminId: row.admin_id,
    adminName: row.admin_id ? (people.get(row.admin_id)?.fullName ?? null) : null,
  }));
}

export async function reviewVendor(vendorId: string, decision: VendorDecision, reason: string): Promise<void> {
  await requireUserId();
  const note = reasonOrThrow(reason, decision === 'rejected' ? 'a reason is required to reject a vendor' : null);
  const { error } = await supabase.rpc('admin_review_vendor', {
    vendor_id: vendorId,
    decision,
    reason: note,
  });
  raiseIfError(error);
}

export async function removeVendor(vendorId: string, reason: string): Promise<void> {
  await requireUserId();
  const note = reasonOrThrow(reason, 'a reason is required to remove a vendor');
  const { error } = await supabase.rpc('admin_remove_vendor', { vendor_id: vendorId, reason: note });
  raiseIfError(error);
}

export async function moderateProduct(
  productId: string,
  status: ProductModerationStatus,
  reason: string,
): Promise<void> {
  await requireUserId();
  const note = reasonOrThrow(
    reason,
    status === 'removed_by_admin' ? 'a reason is required to remove a product' : null,
  );
  const { error } = await supabase.rpc('admin_moderate_product', {
    product_id: productId,
    new_status: status,
    reason: note,
  });
  raiseIfError(error);
}
