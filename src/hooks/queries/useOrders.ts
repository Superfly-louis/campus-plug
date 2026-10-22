import type { RealtimeChannel } from '@supabase/supabase-js';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import type { OrderListFilter } from '@/constants/orderStatus';
import { limits } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { isOrderStatusConflict } from '@/lib/errors';
import {
  getOrder,
  incomingPendingCount,
  listOrders,
  placeOrder,
  updateOrderStatus,
  type DbOrderStatus,
  type OrderRole,
  type PlaceOrderInput,
} from '@/lib/api/orders';

import { queryKeys } from '@/hooks/queries/keys';
import { useRealtimeActive, useRealtimeChannel } from '@/hooks/realtime/useRealtimeChannel';

export function useOrders(role: OrderRole, filter: OrderListFilter) {
  const { session } = useAuth();
  const userId = session?.user.id ?? '';
  return useInfiniteQuery({
    queryKey: queryKeys.orders.list(userId, role, filter),
    enabled: userId.length > 0,
    initialPageParam: 0,
    queryFn: ({ pageParam }) => listOrders(role, filter, pageParam),
    getNextPageParam: (lastPage, _pages, lastOffset) =>
      lastPage.length < limits.orderPageSize ? undefined : lastOffset + limits.orderPageSize,
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: queryKeys.orders.detail(id),
    enabled: id.length > 0,
    queryFn: () => getOrder(id),
  });
}

export function useIncomingPendingCount(enabled = true) {
  const { session } = useAuth();
  const userId = session?.user.id ?? '';
  return useQuery({
    queryKey: queryKeys.orders.incomingPending(userId),
    enabled: enabled && userId.length > 0,
    queryFn: incomingPendingCount,
  });
}

export function usePlaceOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PlaceOrderInput) => placeOrder(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all });
    },
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { orderId: string; status: DbOrderStatus }) => updateOrderStatus(input.orderId, input.status),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
    },
    onError: async (error) => {
      if (!isOrderStatusConflict(error)) return;
      await queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
    },
  });
}

export function useOrdersRealtime(): void {
  const { session } = useAuth();
  const userId = session?.user.id;
  const queryClient = useQueryClient();
  const active = useRealtimeActive();
  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
  }, [queryClient]);
  const setup = useCallback(
    (channel: RealtimeChannel) => {
      if (!userId) return;
      channel
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'orders', filter: `buyer_id=eq.${userId}` },
          refresh,
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'orders', filter: `vendor_user_id=eq.${userId}` },
          refresh,
        );
    },
    [refresh, userId],
  );

  useRealtimeChannel(Boolean(userId) && active, userId ? `orders:${userId}` : 'orders:idle', setup, refresh);
}
