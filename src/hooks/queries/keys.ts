import type { OrderListFilter } from '@/constants/orderStatus';
import type { AdminProductStatus, AdminVendorStatus } from '@/lib/api/admin';
import type { OrderRole } from '@/lib/api/orders';
import type { ProductSearchFilters, VendorProductScope } from '@/lib/api/products';

export const queryKeys = {
  categories: ['categories'] as const,
  vendors: {
    all: ['vendors'] as const,
    public: ['vendors', 'public'] as const,
    own: (userId: string) => ['vendors', 'own', userId] as const,
    detail: (id: string) => ['vendors', 'detail', id] as const,
  },
  products: {
    all: ['products'] as const,
    search: (filters: ProductSearchFilters) => ['products', 'search', filters] as const,
    detail: (id: string) => ['products', 'detail', id] as const,
    byVendor: (vendorId: string, scope: VendorProductScope) =>
      ['products', 'by-vendor', vendorId, scope] as const,
    covers: ['products', 'covers'] as const,
    homeMeta: ['products', 'home-meta'] as const,
    vendorIds: (categoryId: string) => ['products', 'vendor-ids', categoryId] as const,
  },
  conversations: {
    all: ['conversations'] as const,
    list: (userId: string) => ['conversations', 'list', userId] as const,
  },
  messages: {
    all: ['messages'] as const,
    thread: (conversationId: string) => ['messages', 'thread', conversationId] as const,
  },
  orders: {
    all: ['orders'] as const,
    list: (userId: string, role: OrderRole, filter: OrderListFilter) =>
      ['orders', 'list', userId, role, filter] as const,
    detail: (id: string) => ['orders', 'detail', id] as const,
    incomingPending: (userId: string) => ['orders', 'incoming-pending', userId] as const,
  },
  notifications: {
    all: ['notifications'] as const,
    list: (userId: string) => ['notifications', 'list', userId] as const,
    unread: (userId: string) => ['notifications', 'unread', userId] as const,
  },
  profile: {
    all: ['profile'] as const,
  },
  admin: {
    all: ['admin'] as const,
    vendors: (userId: string, status: AdminVendorStatus) => ['admin', 'vendors', userId, status] as const,
    products: (userId: string, status: AdminProductStatus) => ['admin', 'products', userId, status] as const,
    audit: (userId: string) => ['admin', 'audit', userId] as const,
  },
};
