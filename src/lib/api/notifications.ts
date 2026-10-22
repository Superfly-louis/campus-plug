import { limits } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

import { raiseIfError, requireUserId } from '@/lib/api/shared';

import type { Json } from '../../../types/database.types';

export type AppNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Json;
  readAt: string | null;
  createdAt: string;
};

type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Json;
  read_at: string | null;
  created_at: string;
};

const notificationColumns = 'id, type, title, body, data, read_at, created_at';

function toNotification(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    data: row.data,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

export async function listNotifications(offset: number): Promise<AppNotification[]> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from('notifications')
    .select(notificationColumns)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(offset, offset + limits.notificationPageSize - 1);
  raiseIfError(error);
  return (data ?? []).map(toNotification);
}

export async function markNotificationRead(id: string): Promise<void> {
  const userId = await requireUserId();
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId)
    .is('read_at', null);
  raiseIfError(error);
}

export async function unreadNotificationCount(): Promise<number> {
  const userId = await requireUserId();
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null);
  raiseIfError(error);
  return count ?? 0;
}

export async function registerPushToken(token: string, platform: 'ios' | 'android'): Promise<void> {
  const { error } = await supabase.rpc('register_push_token', { token, platform });
  raiseIfError(error);
}

export async function deactivatePushToken(token: string): Promise<void> {
  const { error } = await supabase.rpc('deactivate_push_token', { token });
  raiseIfError(error);
}

async function edgeErrorMessage(error: unknown): Promise<string> {
  const context =
    typeof error === 'object' && error !== null && 'context' in error
      ? (error as { context?: unknown }).context
      : null;
  if (context instanceof Response) {
    try {
      const payload: unknown = await context.json();
      if (typeof payload === 'object' && payload !== null && 'error' in payload) {
        const value = (payload as { error?: unknown }).error;
        if (typeof value === 'string' && value.length > 0) return value;
      }
    } catch {
      // The function body was not JSON.
    }
  }
  if (error instanceof Error && error.message) return error.message;
  return 'account delete failed';
}

export async function deleteAccount(): Promise<void> {
  await requireUserId();
  const { error } = await supabase.functions.invoke('delete-account', { body: {} });
  if (error) throw new Error(await edgeErrorMessage(error));
}
