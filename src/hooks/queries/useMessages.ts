import type { RealtimeChannel } from '@supabase/supabase-js';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import * as Crypto from 'expo-crypto';

import { limits } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import {
  listMessages,
  markThreadMessageFailed,
  mergeThreadMessage,
  omitThreadMessage,
  messageFromRealtime,
  sendTextMessage,
  type ChatMessage,
  type ThreadData,
} from '@/lib/api/messages';

import { queryKeys } from '@/hooks/queries/keys';
import { useRealtimeActive, useRealtimeChannel } from '@/hooks/realtime/useRealtimeChannel';

export function useMessages(conversationId: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.messages.thread(conversationId),
    enabled: conversationId.length > 0,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => listMessages(conversationId, pageParam),
    getNextPageParam: (lastPage) =>
      lastPage.length < limits.messagePageSize ? undefined : lastPage[lastPage.length - 1]?.created_at,
  });
}

export function useSendMessage(conversationId: string) {
  const { session } = useAuth();
  const userId = session?.user.id ?? '';
  const queryClient = useQueryClient();
  const threadKey = queryKeys.messages.thread(conversationId);

  return useMutation({
    mutationFn: ({ body }: { body: string; replaceClientId?: string }) => sendTextMessage(conversationId, body),
    onMutate: async ({ body, replaceClientId }) => {
      await queryClient.cancelQueries({ queryKey: threadKey });
      const clientId = Crypto.randomUUID();
      const now = new Date().toISOString();
      const optimistic: ChatMessage = {
        id: clientId,
        clientId,
        conversation_id: conversationId,
        sender_id: userId,
        type: 'text',
        body: body.trim(),
        order_id: null,
        read_at: null,
        created_at: now,
        updated_at: now,
        delivery: 'pending',
      };
      queryClient.setQueryData<ThreadData>(threadKey, (current) =>
        mergeThreadMessage(replaceClientId ? omitThreadMessage(current, replaceClientId) : current, optimistic),
      );
      return { clientId };
    },
    onSuccess: (saved, _input, context) => {
      queryClient.setQueryData<ThreadData>(threadKey, (current) =>
        mergeThreadMessage(current, saved, context?.clientId),
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all });
    },
    onError: (_error, _input, context) => {
      if (!context?.clientId) return;
      queryClient.setQueryData<ThreadData>(threadKey, (current) => markThreadMessageFailed(current, context.clientId));
    },
  });
}

export function useConversationRealtime(conversationId: string): void {
  const queryClient = useQueryClient();
  const active = useRealtimeActive();
  const threadKey = queryKeys.messages.thread(conversationId);
  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: threadKey });
  }, [queryClient, threadKey]);
  const setup = useCallback(
    (channel: RealtimeChannel) => {
      channel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const incoming = messageFromRealtime(payload.new);
          if (!incoming || incoming.conversation_id !== conversationId) return;
          queryClient.setQueryData<ThreadData>(threadKey, (current) => mergeThreadMessage(current, incoming));
        },
      );
      channel.on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const incoming = messageFromRealtime(payload.new);
          if (!incoming || incoming.conversation_id !== conversationId) return;
          queryClient.setQueryData<ThreadData>(threadKey, (current) => mergeThreadMessage(current, incoming));
        },
      );
    },
    [conversationId, queryClient, threadKey],
  );

  useRealtimeChannel(conversationId.length > 0 && active, `messages:${conversationId || 'idle'}`, setup, refresh);
}
