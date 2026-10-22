import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { categoryVisual } from '@/constants/categories';
import { marketplace } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { getImageUrl } from '@/lib/images';
import { vendorHomeMeta } from '@/lib/api/products';
import {
  createVendor,
  getOwnVendor,
  getVendor,
  listPublicVendors,
  updateShop,
  type CreateVendorInput,
  type UpdateShopInput,
} from '@/lib/api/vendors';

import { queryKeys } from '@/hooks/queries/keys';

/** Captured when this module loads, so the New badge does not call Date.now during render. */
const openedAt = Date.now();

export function usePublicVendors() {
  return useQuery({
    queryKey: queryKeys.vendors.public,
    queryFn: listPublicVendors,
  });
}

export type HomeVendorCard = {
  id: string;
  name: string;
  categoryLabel: string | null;
  productCount: number;
  coverUrl: string | null;
  logoUrl: string | null;
  isNew: boolean;
};

export function useHomeVendors() {
  const vendors = usePublicVendors();
  const meta = useQuery({
    queryKey: queryKeys.products.homeMeta,
    queryFn: vendorHomeMeta,
  });

  const cards = useMemo<HomeVendorCard[]>(() => {
    return (vendors.data ?? []).map((vendor) => {
      const item = meta.data?.[vendor.id];
      const visual = item?.categorySlug
        ? categoryVisual(item.categorySlug, item.categoryName ?? item.categorySlug)
        : null;
      const created = Date.parse(vendor.created_at);
      return {
        id: vendor.id,
        name: vendor.shop_name,
        categoryLabel: visual?.label ?? null,
        productCount: item?.productCount ?? 0,
        coverUrl: getImageUrl('product-images', item?.coverPath),
        logoUrl: getImageUrl('shop-logos', vendor.logo_url),
        isNew: Number.isFinite(created) && openedAt - created >= 0 && openedAt - created < marketplace.newVendorMs,
      };
    });
  }, [meta.data, vendors.data]);

  return {
    cards,
    isPending: vendors.isPending || meta.isPending,
    isError: vendors.isError || meta.isError,
    error: vendors.error ?? meta.error,
    isRefetching: vendors.isRefetching || meta.isRefetching,
    refetch: () => Promise.all([vendors.refetch(), meta.refetch()]),
  };
}

export function useVendor(id: string) {
  return useQuery({
    queryKey: queryKeys.vendors.detail(id),
    enabled: id.length > 0,
    queryFn: () => getVendor(id),
  });
}

export function useOwnVendor() {
  const { session } = useAuth();
  const userId = session?.user.id ?? '';
  return useQuery({
    queryKey: queryKeys.vendors.own(userId),
    enabled: userId.length > 0,
    queryFn: getOwnVendor,
  });
}

export function useCreateVendor() {
  const queryClient = useQueryClient();
  const { refreshProfile } = useAuth();
  return useMutation({
    mutationFn: (input: CreateVendorInput) => createVendor(input),
    onSuccess: async () => {
      await refreshProfile();
      await queryClient.invalidateQueries({ queryKey: queryKeys.vendors.all });
    },
  });
}

export function useUpdateShop() {
  const queryClient = useQueryClient();
  const { refreshProfile } = useAuth();
  return useMutation({
    mutationFn: (input: UpdateShopInput) => updateShop(input),
    onSuccess: async () => {
      await refreshProfile();
      await queryClient.invalidateQueries({ queryKey: queryKeys.vendors.all });
    },
  });
}
