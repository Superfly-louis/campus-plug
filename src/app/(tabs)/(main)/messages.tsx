import { router } from 'expo-router';
import { FlatList, Text } from 'react-native';

import { ConversationListState } from '@/components/chat/ChatListState';
import { ConversationRow } from '@/components/chat/ConversationRow';
import { Screen } from '@/components/ui/Screen';
import { useTabBarInset } from '@/components/ui/TabBar';
import { spacing, typography } from '@/constants/theme';
import { useConversations, useConversationsRealtime } from '@/hooks/queries/useConversations';
import { formatDayLabel, formatTime } from '@/lib/format';

function listTime(value: string | null): string {
  if (!value) return '';
  return formatDayLabel(value) === 'Today' ? formatTime(value) : formatDayLabel(value);
}

export default function MessagesScreen() {
  const tabInset = useTabBarInset();
  const conversations = useConversations();
  useConversationsRealtime();
  const rows = conversations.data ?? [];
  const showRows = !conversations.isPending && !conversations.isError;

  return (
    <Screen>
      <FlatList contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ flexGrow: 1, gap: spacing.sm, paddingBottom: spacing.xl + tabInset }}
        data={showRows ? rows : []}
        keyExtractor={(item) => item.id}
        style={{ flex: 1 }}
        onRefresh={() => {
          void conversations.refetch();
        }}
        refreshing={conversations.isRefetching}
        ListHeaderComponent={
          <Text style={[typography.h1, { marginBottom: spacing.sm }]}>Messages</Text>
        }
        ListEmptyComponent={
          <ConversationListState
            empty
            error={conversations.error}
            onRetry={() => {
              void conversations.refetch();
            }}
            pending={conversations.isPending}
          >
            {null}
          </ConversationListState>
        }
        renderItem={({ item }) => (
          <ConversationRow
            imageUrl={item.counterpartImageUrl}
            name={item.counterpartName ?? ''}
            onPress={() => router.push({ pathname: '/chat/[conversationId]', params: { conversationId: item.id } })}
            preview={item.preview}
            time={listTime(item.lastMessageAt)}
            unreadCount={item.unreadCount}
          />
        )}
      />
    </Screen>
  );
}
