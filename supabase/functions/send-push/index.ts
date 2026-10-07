import { adminClient } from '../_shared/admin.ts';
import { handleOptions, json, webhookSecretMatches } from '../_shared/http.ts';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_RECEIPTS_URL = 'https://exp.host/--/api/v2/push/getReceipts';
const BACKOFF_MS = [60_000, 5 * 60_000, 15 * 60_000, 60 * 60_000, 6 * 60 * 60_000];
const BATCH_SIZE = 100;

type TicketPair = { ticket_id: string; token: string };

type PushNotification = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  push_attempts: number;
  push_sent_at: string | null;
  push_tickets: TicketPair[] | null;
};

type ExpoTicket = {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
};

type Outbound = {
  notificationId: string;
  token: string;
  message: {
    to: string;
    title: string;
    body: string;
    data: Record<string, unknown>;
    sound: 'default';
  };
};

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);
  if (!(await webhookSecretMatches(req, 'PUSH_WEBHOOK_SECRET'))) {
    return json({ error: 'unauthorized' }, 401);
  }

  try {
    const payload = await readPayload(req);
    const notificationId = payload.notification_id ?? payload.record?.id ?? null;
    const supabase = adminClient();

    await checkReceipts(supabase);

    const { data, error } = await supabase.rpc('claim_push_notifications', {
      notification_id: notificationId,
    });
    if (error) {
      console.error('claim_push_notifications failed', error.message);
      return json({ error: 'claim failed' }, 500);
    }

    const claimed = (data ?? []) as PushNotification[];
    const result = await deliver(supabase, claimed);
    return json({ claimed: claimed.length, ...result });
  } catch (deliveryError) {
    console.error('send-push failed', deliveryError);
    return json({ error: 'send failed' }, 500);
  }
});

async function readPayload(req: Request): Promise<{
  notification_id?: string;
  record?: { id?: string };
}> {
  const text = await req.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as { notification_id?: string; record?: { id?: string } };
  } catch {
    return {};
  }
}

async function deliver(
  supabase: ReturnType<typeof adminClient>,
  notifications: PushNotification[],
): Promise<{ sent: number; failed: number; skipped: number }> {
  const counts = { sent: 0, failed: 0, skipped: 0 };
  if (notifications.length === 0) return counts;

  const userIds = [...new Set(notifications.map((row) => row.user_id))];
  const { data: tokenRows, error } = await supabase
    .from('push_tokens')
    .select('user_id, token')
    .in('user_id', userIds)
    .eq('is_active', true);
  if (error) throw new Error(error.message);

  const tokensByUser = new Map<string, string[]>();
  for (const row of tokenRows ?? []) {
    const list = tokensByUser.get(row.user_id) ?? [];
    list.push(row.token);
    tokensByUser.set(row.user_id, list);
  }

  const outbound: Outbound[] = [];
  for (const notification of notifications) {
    const tokens = tokensByUser.get(notification.user_id) ?? [];
    if (tokens.length === 0) {
      await markSkipped(supabase, notification.id);
      counts.skipped += 1;
      continue;
    }

    for (const token of tokens) {
      outbound.push({
        notificationId: notification.id,
        token,
        message: {
          to: token,
          title: notification.title,
          body: notification.body,
          sound: 'default',
          data: { ...(notification.data ?? {}), notification_id: notification.id },
        },
      });
    }
  }

  const ticketsByNotification = new Map<string, TicketPair[]>();
  const errorsByNotification = new Map<string, string>();
  const deadTokens = new Set<string>();

  for (const batch of chunks(outbound, BATCH_SIZE)) {
    let tickets: ExpoTicket[];
    try {
      tickets = await postExpo(EXPO_PUSH_URL, batch.map((item) => item.message));
    } catch (batchError) {
      const message = batchError instanceof Error ? batchError.message : 'expo push failed';
      for (const item of batch) errorsByNotification.set(item.notificationId, message);
      continue;
    }

    batch.forEach((item, index) => {
      const ticket = tickets[index];
      if (!ticket) {
        errorsByNotification.set(item.notificationId, 'missing expo ticket');
        return;
      }
      if (ticket.status === 'ok' && ticket.id) {
        const saved = ticketsByNotification.get(item.notificationId) ?? [];
        saved.push({ ticket_id: ticket.id, token: item.token });
        ticketsByNotification.set(item.notificationId, saved);
        return;
      }
      if (ticket.details?.error === 'DeviceNotRegistered') {
        deadTokens.add(item.token);
        return;
      }
      errorsByNotification.set(item.notificationId, ticket.message ?? ticket.details?.error ?? 'expo ticket error');
    });
  }

  if (deadTokens.size > 0) await deactivateTokens(supabase, [...deadTokens]);

  for (const notification of notifications) {
    if ((tokensByUser.get(notification.user_id) ?? []).length === 0) continue;

    const tickets = ticketsByNotification.get(notification.id) ?? [];
    const failure = errorsByNotification.get(notification.id);
    if (tickets.length > 0) {
      const { error: updateError } = await supabase
        .from('notifications')
        .update({
          push_status: 'sent',
          push_sent_at: new Date().toISOString(),
          push_tickets: tickets,
          push_last_error: null,
          push_receipt_checked_at: null,
        })
        .eq('id', notification.id);
      if (updateError) console.error('mark sent failed', updateError.message);
      counts.sent += 1;
      continue;
    }

    const tokens = tokensByUser.get(notification.user_id) ?? [];
    const allDead = tokens.every((token) => deadTokens.has(token));
    if (allDead) {
      await markSkipped(supabase, notification.id);
      counts.skipped += 1;
      continue;
    }

    await markFailed(supabase, notification, failure ?? 'push failed');
    counts.failed += 1;
  }

  return counts;
}

async function checkReceipts(supabase: ReturnType<typeof adminClient>): Promise<void> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('notifications')
    .select('id, push_tickets, push_sent_at')
    .eq('push_status', 'sent')
    .is('push_receipt_checked_at', null)
    .gte('push_sent_at', since)
    .limit(BATCH_SIZE);
  if (error || !data) return;

  const pending = (data as Pick<PushNotification, 'id' | 'push_tickets' | 'push_sent_at'>[])
    .filter((row) => Array.isArray(row.push_tickets) && row.push_tickets.length > 0);
  const ticketIds = pending.flatMap((row) => (row.push_tickets ?? []).map((ticket) => ticket.ticket_id));
  const receipts = new Map<string, ExpoTicket>();

  for (const batch of chunks(ticketIds, BATCH_SIZE)) {
    if (batch.length === 0) continue;
    try {
      const body = await postJson(EXPO_RECEIPTS_URL, { ids: batch });
      const mapped = (body.data ?? {}) as Record<string, ExpoTicket>;
      for (const [id, receipt] of Object.entries(mapped)) receipts.set(id, receipt);
    } catch (receiptError) {
      console.error('receipt check failed', receiptError);
    }
  }

  const deadTokens: string[] = [];
  for (const row of pending) {
    const tickets = row.push_tickets ?? [];
    const sentAt = row.push_sent_at ? new Date(row.push_sent_at).getTime() : 0;
    const ageMs = Date.now() - sentAt;
    let unresolved = false;

    for (const ticket of tickets) {
      const receipt = receipts.get(ticket.ticket_id);
      if (!receipt) {
        unresolved = true;
        continue;
      }
      if (receipt.details?.error === 'DeviceNotRegistered') deadTokens.push(ticket.token);
    }

    const ready = !unresolved || ageMs > 24 * 60 * 60 * 1000;
    const waitedLongEnough = ageMs > 15 * 60 * 1000;
    if (ready || (waitedLongEnough && tickets.every((ticket) => receipts.has(ticket.ticket_id)))) {
      await supabase
        .from('notifications')
        .update({ push_receipt_checked_at: new Date().toISOString() })
        .eq('id', row.id);
    }
  }

  if (deadTokens.length > 0) await deactivateTokens(supabase, deadTokens);
}

async function postExpo(url: string, messages: Outbound['message'][]): Promise<ExpoTicket[]> {
  const body = await postJson(url, messages);
  if (Array.isArray(body.data)) return body.data as ExpoTicket[];
  if (body.data && typeof body.data === 'object') return [body.data as ExpoTicket];
  return [];
}

async function postJson(url: string, payload: unknown): Promise<{ data?: unknown; errors?: unknown }> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`expo http ${response.status}`);
  }
  return body as { data?: unknown; errors?: unknown };
}

async function markSkipped(supabase: ReturnType<typeof adminClient>, id: string): Promise<void> {
  await supabase.from('notifications').update({ push_status: 'skipped' }).eq('id', id);
}

async function markFailed(
  supabase: ReturnType<typeof adminClient>,
  notification: PushNotification,
  message: string,
): Promise<void> {
  const attempts = notification.push_attempts + 1;
  const delay = BACKOFF_MS[Math.min(attempts, BACKOFF_MS.length) - 1];
  await supabase
    .from('notifications')
    .update({
      push_status: 'failed',
      push_attempts: attempts,
      push_last_error: message.slice(0, 500),
      next_attempt_at: new Date(Date.now() + delay).toISOString(),
    })
    .eq('id', notification.id);
}

async function deactivateTokens(supabase: ReturnType<typeof adminClient>, tokens: string[]): Promise<void> {
  const unique = [...new Set(tokens)];
  await supabase.from('push_tokens').update({ is_active: false }).in('token', unique);
}

function chunks<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }
  return batches;
}
