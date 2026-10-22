import { limits } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import {
  categoryIdSchema,
  parseOrThrow,
  productDescriptionSchema,
  productDraftSchema,
  productPriceSchema,
  productTitleSchema,
} from '@/lib/validation';

import type { Category } from '@/lib/api/categories';
import { raiseIfError, requireData } from '@/lib/api/shared';
import type { Vendor } from '@/lib/api/vendors';

import type { Database, Tables, TablesUpdate } from '../../../types/database.types';

export type Product = Tables<'products'>;
export type ProductImage = Tables<'product_images'>;
export type ProductSort = 'newest' | 'price_asc' | 'price_desc' | 'relevance';
export type VendorProductScope = 'public' | 'owner';

export type ProductSearchFilters = {
  q?: string;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: ProductSort;
};

export type ProductSearchHit = {
  id: string;
  vendorId: string;
  categoryId: string | null;
  title: string;
  description: string | null;
  price: number;
  isAvailable: boolean;
  status: Database['public']['Enums']['product_status'];
  createdAt: string;
  imagePath: string | null;
  shopName: string;
};

export type ProductDetail = {
  product: Product;
  images: ProductImage[];
  category: Category | null;
  vendor: Vendor;
};

export type VendorProduct = {
  product: Product;
  images: ProductImage[];
  category: Category | null;
};

export type CreateProductInput = {
  vendorId: string;
  title: string;
  description: string;
  price: number | string;
  categoryId: string;
  isAvailable: boolean;
  status: 'active' | 'hidden';
};

export type UpdateProductInput = {
  id: string;
  title?: string;
  description?: string;
  price?: number | string;
  categoryId?: string;
  isAvailable?: boolean;
  status?: 'active' | 'hidden';
};

const sorts: readonly ProductSort[] = ['newest', 'price_asc', 'price_desc', 'relevance'];

export function normalizeProductSearch(filters: ProductSearchFilters): ProductSearchFilters {
  const q = filters.q?.trim();
  const sort = filters.sort ?? 'newest';
  if (!sorts.includes(sort)) throw new Error('That sort is not available.');
  return {
    q: q ? q : undefined,
    categoryId: filters.categoryId || undefined,
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    sort,
  };
}

export async function searchProducts(
  filters: ProductSearchFilters,
  offset: number,
): Promise<ProductSearchHit[]> {
  const normalized = normalizeProductSearch(filters);
  const { data, error } = await supabase.rpc('search_products', {
    q: normalized.q,
    category_id: normalized.categoryId,
    min_price: normalized.minPrice,
    max_price: normalized.maxPrice,
    sort: normalized.sort,
    limit: limits.searchPageSize,
    offset,
  });
  raiseIfError(error);
  return (data ?? []).flatMap((row) => {
    const hit = toSearchHit(row);
    return hit ? [hit] : [];
  });
}

export async function getProduct(id: string): Promise<ProductDetail | null> {
  const { data, error } = await supabase
    .from('products')
    .select('*, product_images(*), categories(*), vendors(*)')
    .eq('id', id)
    .maybeSingle();
  raiseIfError(error);
  if (!data) return null;

  const vendor = asOne(data.vendors);
  if (!vendor) throw new Error('That shop could not be loaded.');
  const { product_images: images, categories, vendors: _vendor, ...product } = data;
  return {
    product,
    images: sortImages(images ?? []),
    category: asOne(categories),
    vendor,
  };
}

export async function listVendorProducts(
  vendorId: string,
  scope: VendorProductScope,
): Promise<VendorProduct[]> {
  let request = supabase
    .from('products')
    .select('*, product_images(*), categories(*)')
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false });
  if (scope === 'public') request = request.eq('status', 'active');

  const { data, error } = await request;
  raiseIfError(error);
  return (data ?? []).map((row) => {
    const { product_images: images, categories, ...product } = row;
    return {
      product,
      images: sortImages(images ?? []),
      category: asOne(categories),
    };
  });
}

export async function latestProductImageByVendor(): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from('products')
    .select('vendor_id, product_images(storage_path, position)')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(limits.coverSampleSize);
  raiseIfError(error);

  const covers: Record<string, string> = {};
  for (const row of data ?? []) {
    if (covers[row.vendor_id]) continue;
    const path = sortImages(row.product_images ?? [])[0]?.storage_path;
    if (path) covers[row.vendor_id] = path;
  }
  return covers;
}

export type VendorHomeMeta = {
  coverPath: string | null;
  categorySlug: string | null;
  categoryName: string | null;
  productCount: number;
};

export async function vendorHomeMeta(): Promise<Record<string, VendorHomeMeta>> {
  const [sample, counted] = await Promise.all([
    supabase
      .from('products')
      .select('vendor_id, categories(id, slug, name), product_images(storage_path, position)')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(limits.coverSampleSize),
    supabase.from('products').select('vendor_id').eq('status', 'active'),
  ]);
  raiseIfError(sample.error);
  raiseIfError(counted.error);

  const meta: Record<string, VendorHomeMeta> = {};
  const entry = (vendorId: string): VendorHomeMeta => {
    const existing = meta[vendorId];
    if (existing) return existing;
    const created: VendorHomeMeta = {
      coverPath: null,
      categorySlug: null,
      categoryName: null,
      productCount: 0,
    };
    meta[vendorId] = created;
    return created;
  };

  for (const row of counted.data ?? []) {
    entry(row.vendor_id).productCount += 1;
  }

  for (const row of sample.data ?? []) {
    const item = entry(row.vendor_id);
    const category = asOne(row.categories);
    if (!item.categorySlug && category) {
      item.categorySlug = category.slug;
      item.categoryName = category.name;
    }
    if (!item.coverPath) {
      item.coverPath = sortImages(row.product_images ?? [])[0]?.storage_path ?? null;
    }
  }

  return meta;
}

export async function vendorIdsInCategory(categoryId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('products')
    .select('vendor_id')
    .eq('status', 'active')
    .eq('category_id', categoryId);
  raiseIfError(error);
  const ids = new Set<string>();
  for (const row of data ?? []) ids.add(row.vendor_id);
  return [...ids];
}

export async function createProduct(input: CreateProductInput): Promise<Product> {
  const draft = parseOrThrow(productDraftSchema, input);
  const { data, error } = await supabase
    .from('products')
    .insert({
      vendor_id: input.vendorId,
      category_id: draft.categoryId,
      title: draft.title,
      description: draft.description,
      price: draft.price,
      is_available: input.isAvailable,
      status: input.status,
    })
    .select('*')
    .single();
  raiseIfError(error);
  return requireData(data);
}

export async function updateProduct(input: UpdateProductInput): Promise<Product> {
  const patch: TablesUpdate<'products'> = {};
  if (input.title !== undefined) patch.title = parseOrThrow(productTitleSchema, input.title);
  if (input.description !== undefined) {
    patch.description = parseOrThrow(productDescriptionSchema, input.description);
  }
  if (input.price !== undefined) patch.price = parseOrThrow(productPriceSchema, input.price);
  if (input.categoryId !== undefined) patch.category_id = parseOrThrow(categoryIdSchema, input.categoryId);
  if (input.isAvailable !== undefined) patch.is_available = input.isAvailable;
  if (input.status !== undefined) patch.status = input.status;
  if (Object.keys(patch).length === 0) throw new Error('Nothing to update.');

  const { data, error } = await supabase.from('products').update(patch).eq('id', input.id).select('*').single();
  raiseIfError(error);
  return requireData(data);
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from('products').delete().eq('id', id);
  raiseIfError(error);
}

export async function addProductImage(input: {
  productId: string;
  storagePath: string;
  position: number;
}): Promise<ProductImage> {
  const { data, error } = await supabase
    .from('product_images')
    .insert({
      product_id: input.productId,
      storage_path: input.storagePath,
      position: input.position,
    })
    .select('*')
    .single();
  raiseIfError(error);
  return requireData(data);
}

export async function removeProductImage(id: string): Promise<void> {
  const { error } = await supabase.from('product_images').delete().eq('id', id);
  raiseIfError(error);
}

function toSearchHit(row: Database['public']['CompositeTypes']['product_search_result']): ProductSearchHit | null {
  if (!row.id || !row.vendor_id || !row.title || row.price == null || row.is_available == null || !row.status) {
    return null;
  }
  if (!row.created_at || !row.shop_name) return null;
  return {
    id: row.id,
    vendorId: row.vendor_id,
    categoryId: row.category_id,
    title: row.title,
    description: row.description,
    price: row.price,
    isAvailable: row.is_available,
    status: row.status,
    createdAt: row.created_at,
    imagePath: row.image_path,
    shopName: row.shop_name,
  };
}

function sortImages<T extends { position: number; created_at?: string }>(images: readonly T[]): T[] {
  return [...images].sort((left, right) => {
    if (left.position !== right.position) return left.position - right.position;
    return (left.created_at ?? '').localeCompare(right.created_at ?? '');
  });
}

function asOne<T extends { id: string }>(value: T | readonly T[] | null): T | null {
  if (value == null) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value as T;
}
