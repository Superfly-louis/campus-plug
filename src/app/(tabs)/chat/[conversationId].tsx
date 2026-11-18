import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';

import { ChatBubble } from '@/components/chat/ChatBubble';
import { receiptState } from '@/components/chat/ReceiptMarks';
import { ThreadState } from '@/components/chat/ChatListState';
import { MessageComposer } from '@/components/chat/MessageComposer';
import { OrderMessageCard } from '@/components/chat/OrderMessageCard';
import { DateSeparator, SystemMessage } from '@/components/chat/SystemMessage';
import { OrderSheet } from '@/components/orders/OrderSheet';
import { Avatar } from '@/components/ui/Avatar';
import { IconButton } from '@/components/ui/IconButton';
import { Screen } from '@/components/ui/Screen';
import { colors, layout, limits, radius, spacing, typography } from '@/constants/theme';
import { useMarkConversationReadWhenFocused, useConversations } from '@/hooks/queries/useConversations';
import { useConversationRealtime, useMessages, useSendMessage } from '@/hooks/queries/useMessages';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import type { ChatMessage } from '@/lib/api/messages';
import { useAuth } from '@/lib/auth';
import { useOnline } from '@/lib/presence';
import { formatDayLabel, formatTime } from '@/lib/format';

function param(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

type ThreadRow =
  | { key: string; kind: 'message'; message: ChatMessage }
  | { key: string; kind: 'day'; label: string };

function threadRows(messages: ChatMessage[]): ThreadRow[] {
  const rows: ThreadRow[] = [];
  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index];
    if (!message) continue;
    const older = messages[index + 1];
    rows.push({ key: message.id, kind: 'message', message });
    const day = formatDayLabel(message.created_at);
    const olderDay = older ? formatDayLabel(older.created_at) : '';
    if (day !== olderDay) rows.push({ key: `day-${message.id}`, kind: 'day', label: day });
  }
  return rows;
}

export default function ChatScreen() {
  const params = useLocalSearchParams<{ conversationId?: string | string[] }>();
  const conversationId = param(params.conversationId);
  const { session } = useAuth();
  const { offline } = useNetworkStatus();
  const conversations = useConversations();
  const thread = useMessages(conversationId);
  const send = useSendMessage(conversationId);
  useConversationRealtime(conversationId);
  const [draft, setDraft] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const messages = thread.data?.pages.flat() ?? [];
  const newestId = messages[0]?.id ?? '';
  useMarkConversationReadWhenFocused(conversationId, newestId);

  const summary = conversations.data?.find((row) => row.id === conversationId);
  const counterpartId = summary ? (summary.role === 'buyer' ? summary.vendorUserId : summary.buyerId) : '';
  const online = useOnline(counterpartId);
  const name = summary ? (summary.counterpartName?.trim() ? summary.counterpartName : 'Deleted user') : 'Chat';
  const isBuyer = summary?.role === 'buyer' && Boolean(summary.vendorId);
  const rows = threadRows(messages);
  const unavailable = conversationId.length === 0;

  function sendBody(body: string, replaceClientId?: string) {
    if (offline || send.isPending) return;
    send.mutate({ body, replaceClientId });
  }

  function sendDraft() {
    const body = draft.trim();
    if (body.length === 0 || offline || send.isPending) return;
    send.mutate({ body });
    setDraft('');
  }

  return (
    <Screen padded={false}>
      <View style={{ flex: 1, paddingHorizontal: layout.screenPadding, gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <IconButton accessibilityLabel="Go back" name="chevron-left" onPress={() => router.back()} />
          {summary ? <Avatar name={name} online={online} uri={summary.counterpartImageUrl} /> : null}
          <View style={{ flex: 1, minWidth: 0, gap: spacing.xxs }}>
            <Text numberOfLines={1} style={typography.bodyMedium}>
              {unavailable ? 'Chat unavailable' : name}
            </Text>
            {online || (isBuyer && summary) ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                {online ? <Text style={[typography.caption, { color: colors.primary }]}>Online</Text> : null}
                {isBuyer && summary ? (
                  <Pressable
                    accessibilityRole="link"
                    accessibilityLabel={`View ${name}`}
                    onPress={() => router.push({ pathname: '/shop/[id]', params: { id: summary.vendorId } })}
                  >
                    <Text style={[typography.caption, { color: colors.lilac }]}>View shop</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </View>
        </View>
        <View style={{ flex: 1 }}>
        {unavailable ? (
          <Text style={[typography.body, { color: colors.textMuted, textAlign: 'center' }]}>Chat unavailable</Text>
        ) : thread.isPending ? (
          <ThreadState empty error={null} onRetry={() => undefined} pending>
            {null}
          </ThreadState>
        ) : thread.isError ? (
          <ThreadState
            empty={false}
            error={thread.error}
            onRetry={() => {
              void thread.refetch();
            }}
            pending={false}
          >
            {null}
          </ThreadState>
        ) : messages.length === 0 ? (
          <ThreadState empty error={null} onRetry={() => undefined} pending={false}>
            {null}
          </ThreadState>
        ) : (
          <FlatList
            inverted
            contentInsetAdjustmentBehavior="never"
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: 'flex-end',
              gap: spacing.sm,
              paddingVertical: spacing.sm,
            }}
            data={rows}
            keyExtractor={(item) => item.key}
            keyboardShouldPersistTaps="handled"
            style={{ flex: 1 }}
            onEndReached={() => {
              if (thread.hasNextPage && !thread.isFetchingNextPage) void thread.fetchNextPage();
            }}
            onEndReachedThreshold={0.3}
            ListFooterComponent={
              thread.isFetchingNextPage ? <Text style={[typography.caption, { textAlign: 'center' }]}>Loading earlier messages…</Text> : undefined
            }
            renderItem={({ item }) => {
              if (item.kind === 'day') return <DateSeparator label={item.label} />;
              const message = item.message;
              if (message.type === 'system') return <SystemMessage body={message.body} />;
              if (message.type === 'order') {
                return (
                  <OrderMessageCard
                    body={message.body}
                    onPress={(orderId) => router.push({ pathname: '/order/[id]', params: { id: orderId } })}
                    orderId={message.order_id}
                  />
                );
              }
              const mine = message.sender_id === session?.user.id;
              return (
                <ChatBubble
                  body={message.body}
                  failed={message.delivery === 'failed'}
                  mine={mine}
                  onRetry={
                    message.delivery === 'failed' && message.clientId
                      ? () => sendBody(message.body, message.clientId)
                      : undefined
                  }
                  pending={message.delivery === 'pending'}
                  receipt={
                    mine && message.delivery !== 'pending' && message.delivery !== 'failed'
                      ? receiptState(message.read_at != null, online)
                      : null
                  }
                  time={formatTime(message.created_at)}
                />
              );
            }}
          />
        )}
        </View>
        {unavailable || thread.isError ? null : (
          <View
            style={{
              paddingBottom: spacing.md,
              gap: spacing.xs,
            }}
          >
            {offline ? (
              <View
                accessibilityRole="alert"
                style={{
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  borderRadius: radius.lg,
                  backgroundColor: colors.warning,
                }}
              >
                <Text style={[typography.bodySmall, { color: colors.textOnPrimary }]}>
                  You are offline. Sending is paused until you reconnect.
                </Text>
              </View>
            ) : null}
            <MessageComposer
              disabled={offline || thread.isPending}
              onAddOrder={isBuyer && summary ? () => setSheetOpen(true) : undefined}
              onChangeText={(value) => setDraft(value.slice(0, limits.messageMax))}
              onSend={sendDraft}
              sending={send.isPending}
              value={draft}
            />
          </View>
        )}
      </View>
      {isBuyer && summary ? (
        <OrderSheet
          items={[]}
          onClose={() => setSheetOpen(false)}
          onPlaced={(placed) => {
            setSheetOpen(false);
            router.push({ pathname: '/order/[id]', params: { id: placed.id } });
          }}
          vendorId={summary.vendorId}
          visible={sheetOpen}
        />
      ) : null}
    </Screen>
  );
}
