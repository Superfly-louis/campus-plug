import type { RealtimeChannel } from '@supabase/supabase-js';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useIsFocused } from 'expo-router';
import { useCallback, useEffect } from 'react';

import { useAuth } from '@/lib/auth';
import { listConversations, markConversationRead, openConversation } from '@/lib/api/conversations';

import { queryKeys } from '@/hooks/queries/keys';
import { useRealtimeActive, useRealtimeChannel } from '@/hooks/realtime/useRealtimeChannel';

export function useConversations() {
  const { session } = useAuth();
  const userId = session?.user.id ?? '';
  return useQuery({
    queryKey: queryKeys.conversations.list(userId),
    enabled: userId.length > 0,
    queryFn: listConversations,
  });
}

export function useOpenConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vendorId: string) => openConversation(vendorId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all });
    },
  });
}

const readDebounceMs = 500;

export function useMarkConversationReadWhenFocused(conversationId: string, newestMessageId: string) {
  const queryClient = useQueryClient();
  const focused = useIsFocused();
  const { mutate } = useMutation({
    mutationFn: (id: string) => markConversationRead(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all });
    },
  });

  useEffect(() => {
    if (!focused || conversationId.length === 0) return;
    const timer = setTimeout(() => {
      mutate(conversationId);
    }, readDebounceMs);
    return () => clearTimeout(timer);
  }, [conversationId, focused, mutate, newestMessageId]);
}

export function useConversationsRealtime(): void {
  const { session } = useAuth();
  const userId = session?.user.id;
  const queryClient = useQueryClient();
  const active = useRealtimeActive();
  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all });
  }, [queryClient]);
  const setup = useCallback(
    (channel: RealtimeChannel) => {
      if (!userId) return;
      channel
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, refresh)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, refresh)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'conversations', filter: `buyer_id=eq.${userId}` },
          refresh,
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'conversations', filter: `vendor_user_id=eq.${userId}` },
          refresh,
        );
    },
    [refresh, userId],
  );

  useRealtimeChannel(Boolean(userId) && active, userId ? `conversations:${userId}` : 'conversations:idle', setup, refresh);
}
