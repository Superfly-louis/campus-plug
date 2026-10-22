import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { limits } from '@/constants/theme';
import {
  addProductImage,
  createProduct,
  deleteProduct,
  getProduct,
  latestProductImageByVendor,
  listVendorProducts,
  normalizeProductSearch,
  removeProductImage,
  searchProducts,
  updateProduct,
  vendorIdsInCategory,
  type CreateProductInput,
  type ProductSearchFilters,
  type UpdateProductInput,
  type VendorProductScope,
} from '@/lib/api/products';

import { queryKeys } from '@/hooks/queries/keys';

async function invalidateCatalog(queryClient: QueryClient) {
  await queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
  await queryClient.invalidateQueries({ queryKey: ['profile'] });
}

export function useProductSearch(filters: ProductSearchFilters, enabled = true) {
  const normalized = normalizeProductSearch(filters);
  return useInfiniteQuery({
    queryKey: queryKeys.products.search(normalized),
    enabled,
    initialPageParam: 0,
    queryFn: ({ pageParam }) => searchProducts(normalized, pageParam),
    getNextPageParam: (lastPage, _pages, lastOffset) =>
      lastPage.length < limits.searchPageSize ? undefined : lastOffset + limits.searchPageSize,
  });
}

export function useVendorIdsInCategory(categoryId: string | null) {
  return useQuery({
    queryKey: queryKeys.products.vendorIds(categoryId ?? ''),
    enabled: Boolean(categoryId),
    queryFn: () => vendorIdsInCategory(categoryId ?? ''),
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: queryKeys.products.detail(id),
    enabled: id.length > 0,
    queryFn: () => getProduct(id),
  });
}

export function useVendorProducts(vendorId: string, scope: VendorProductScope, enabled = true) {
  return useQuery({
    queryKey: queryKeys.products.byVendor(vendorId, scope),
    enabled: enabled && vendorId.length > 0,
    queryFn: () => listVendorProducts(vendorId, scope),
  });
}

export function useLatestProductImages() {
  return useQuery({
    queryKey: queryKeys.products.covers,
    queryFn: latestProductImageByVendor,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProductInput) => createProduct(input),
    onSuccess: () => invalidateCatalog(queryClient),
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProductInput) => updateProduct(input),
    onSuccess: () => invalidateCatalog(queryClient),
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => invalidateCatalog(queryClient),
  });
}

export function useAddProductImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addProductImage,
    onSuccess: () => invalidateCatalog(queryClient),
  });
}

export function useRemoveProductImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => removeProductImage(id),
    onSuccess: () => invalidateCatalog(queryClient),
  });
}
