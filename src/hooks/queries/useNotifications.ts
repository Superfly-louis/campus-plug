import type { RealtimeChannel } from '@supabase/supabase-js';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { limits } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { listNotifications, markNotificationRead } from '@/lib/api/notifications';

import { queryKeys } from '@/hooks/queries/keys';
import { useRealtimeActive, useRealtimeChannel } from '@/hooks/realtime/useRealtimeChannel';

export function useNotifications() {
  const { session } = useAuth();
  const userId = session?.user.id ?? '';
  return useInfiniteQuery({
    queryKey: queryKeys.notifications.list(userId),
    enabled: userId.length > 0,
    initialPageParam: 0,
    queryFn: ({ pageParam }) => listNotifications(pageParam),
    getNextPageParam: (lastPage, _pages, lastOffset) =>
      lastPage.length < limits.notificationPageSize ? undefined : lastOffset + limits.notificationPageSize,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}

export function useNotificationsRealtime(): void {
  const { session } = useAuth();
  const userId = session?.user.id;
  const queryClient = useQueryClient();
  const active = useRealtimeActive();
  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
  }, [queryClient]);
  const setup = useCallback(
    (channel: RealtimeChannel) => {
      if (!userId) return;
      channel
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
          refresh,
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
          refresh,
        );
    },
    [refresh, userId],
  );

  useRealtimeChannel(
    Boolean(userId) && active,
    userId ? `notifications:${userId}` : 'notifications:idle',
    setup,
    refresh,
  );
}
