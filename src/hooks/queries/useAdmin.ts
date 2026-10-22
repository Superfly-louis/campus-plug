import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { limits } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import {
  listAdminProducts,
  listAdminVendors,
  listAuditLog,
  moderateProduct,
  removeVendor,
  reviewVendor,
  type AdminProductStatus,
  type AdminVendorStatus,
  type ProductModerationStatus,
  type VendorDecision,
} from '@/lib/api/admin';

import { queryKeys } from '@/hooks/queries/keys';

function useAdminUserId(): string {
  const { session, profile } = useAuth();
  if (profile?.role !== 'admin') return '';
  return session?.user.id ?? '';
}

export function useAdminVendors(status: AdminVendorStatus, enabled = true) {
  const userId = useAdminUserId();
  return useInfiniteQuery({
    queryKey: queryKeys.admin.vendors(userId, status),
    enabled: enabled && userId.length > 0,
    initialPageParam: 0,
    queryFn: ({ pageParam }) => listAdminVendors(status, pageParam),
    getNextPageParam: (lastPage, _pages, lastOffset) =>
      lastPage.length < limits.adminPageSize ? undefined : lastOffset + limits.adminPageSize,
  });
}

export function useAdminProducts(status: AdminProductStatus, enabled = true) {
  const userId = useAdminUserId();
  return useInfiniteQuery({
    queryKey: queryKeys.admin.products(userId, status),
    enabled: enabled && userId.length > 0,
    initialPageParam: 0,
    queryFn: ({ pageParam }) => listAdminProducts(status, pageParam),
    getNextPageParam: (lastPage, _pages, lastOffset) =>
      lastPage.length < limits.adminPageSize ? undefined : lastOffset + limits.adminPageSize,
  });
}

export function useAuditLog(enabled = true) {
  const userId = useAdminUserId();
  return useInfiniteQuery({
    queryKey: queryKeys.admin.audit(userId),
    enabled: enabled && userId.length > 0,
    initialPageParam: 0,
    queryFn: ({ pageParam }) => listAuditLog(pageParam),
    getNextPageParam: (lastPage, _pages, lastOffset) =>
      lastPage.length < limits.adminPageSize ? undefined : lastOffset + limits.adminPageSize,
  });
}

function useRefreshAdmin() {
  const queryClient = useQueryClient();
  return async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.admin.all });
    await queryClient.invalidateQueries({ queryKey: queryKeys.vendors.all });
    await queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
  };
}

export function useReviewVendor() {
  const refresh = useRefreshAdmin();
  return useMutation({
    mutationFn: (input: { vendorId: string; decision: VendorDecision; reason: string }) =>
      reviewVendor(input.vendorId, input.decision, input.reason),
    onSuccess: refresh,
  });
}

export function useRemoveVendor() {
  const refresh = useRefreshAdmin();
  return useMutation({
    mutationFn: (input: { vendorId: string; reason: string }) => removeVendor(input.vendorId, input.reason),
    onSuccess: refresh,
  });
}

export function useModerateProduct() {
  const refresh = useRefreshAdmin();
  return useMutation({
    mutationFn: (input: { productId: string; status: ProductModerationStatus; reason: string }) =>
      moderateProduct(input.productId, input.status, input.reason),
    onSuccess: refresh,
  });
}
