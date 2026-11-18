import type { InfiniteData } from '@tanstack/react-query';

import { limits } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { messageBodySchema, parseOrThrow } from '@/lib/validation';

import { raiseIfError, requireData, requireUserId } from '@/lib/api/shared';

import type { Tables } from '../../../types/database.types';

export type Message = Tables<'messages'>;

export type ChatMessage = Message & {
  clientId?: string;
  delivery?: 'pending' | 'failed';
};

export type ThreadData = InfiniteData<ChatMessage[], string | undefined>;

export async function listMessages(conversationId: string, before?: string): Promise<ChatMessage[]> {
  let request = supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limits.messagePageSize);

  if (before) request = request.lt('created_at', before);

  const { data, error } = await request;
  raiseIfError(error);
  return data ?? [];
}

export async function sendTextMessage(conversationId: string, body: string): Promise<ChatMessage> {
  const senderId = await requireUserId();
  const text = parseOrThrow(messageBodySchema, body);
  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      type: 'text',
      body: text,
      order_id: null,
    })
    .select('*')
    .single();
  raiseIfError(error);
  return requireData(data);
}

export function messageFromRealtime(value: unknown): ChatMessage | null {
  if (typeof value !== 'object' || value === null) return null;
  const row = value as Partial<ChatMessage>;
  if (typeof row.id !== 'string' || typeof row.conversation_id !== 'string') return null;
  if (typeof row.body !== 'string' || typeof row.sender_id !== 'string' || typeof row.created_at !== 'string') {
    return null;
  }
  if (row.type !== 'text' && row.type !== 'order' && row.type !== 'system') return null;
  return {
    id: row.id,
    conversation_id: row.conversation_id,
    sender_id: row.sender_id,
    type: row.type,
    body: row.body,
    order_id: typeof row.order_id === 'string' ? row.order_id : null,
    read_at: typeof row.read_at === 'string' ? row.read_at : null,
    created_at: row.created_at,
    updated_at: typeof row.updated_at === 'string' ? row.updated_at : row.created_at,
  };
}

function pagesOf(current: ThreadData | undefined): ChatMessage[][] {
  return current?.pages.map((page) => [...page]) ?? [[]];
}

export function mergeThreadMessage(current: ThreadData | undefined, incoming: ChatMessage, clientId?: string): ThreadData {
  const pages = pagesOf(current);
  const pageParams = current?.pageParams ?? [undefined];
  for (let pageIndex = 0; pageIndex < pages.length; pageIndex += 1) {
    const existingIndex = pages[pageIndex].findIndex((message) => message.id === incoming.id);
    if (existingIndex >= 0) {
      const existing = pages[pageIndex][existingIndex];
      if (!existing) return { pages, pageParams };
      pages[pageIndex][existingIndex] = {
        ...existing,
        ...incoming,
        clientId: existing.clientId,
        delivery: existing.delivery,
        read_at: incoming.read_at ?? existing.read_at,
      };
      return { pages, pageParams };
    }
  }

  const matches = (message: ChatMessage) =>
    (clientId != null && message.clientId === clientId) ||
    (message.delivery === 'pending' &&
      message.sender_id === incoming.sender_id &&
      message.body === incoming.body &&
      message.type === incoming.type);

  for (let pageIndex = 0; pageIndex < pages.length; pageIndex += 1) {
    const index = pages[pageIndex].findIndex(matches);
    if (index >= 0) {
      pages[pageIndex][index] = incoming;
      return { pages, pageParams };
    }
  }

  pages[0] = [incoming, ...pages[0]];
  return { pages, pageParams };
}

export function omitThreadMessage(current: ThreadData | undefined, clientId: string): ThreadData | undefined {
  if (!current) return current;
  return {
    ...current,
    pages: current.pages.map((page) => page.filter((message) => message.clientId !== clientId)),
  };
}

export function markThreadMessageFailed(current: ThreadData | undefined, clientId: string): ThreadData | undefined {
  if (!current) return current;
  return {
    ...current,
    pages: current.pages.map((page) =>
      page.map((message) => (message.clientId === clientId ? { ...message, delivery: 'failed' as const } : message)),
    ),
  };
}
