import { router } from 'expo-router';
import { FlatList, View } from 'react-native';

import { ConversationListState } from '@/components/chat/ChatListState';
import { ConversationRow } from '@/components/chat/ConversationRow';
import { PageHero } from '@/components/ui/PageHero';
import { refreshControlFor } from '@/components/ui/RefreshSpinner';
import { Screen } from '@/components/ui/Screen';
import { ShellHeader } from '@/components/ui/ShellHeader';
import { useTabBarInset } from '@/components/ui/TabBar';
import { spacing } from '@/constants/theme';
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
      <FlatList
        contentInsetAdjustmentBehavior="never"
        removeClippedSubviews={false}
        contentContainerStyle={{ paddingBottom: spacing.xl + tabInset }}
        data={showRows ? rows : []}
        keyExtractor={(item) => item.id}
        style={{ flex: 1 }}
        refreshControl={refreshControlFor({
          onRefresh: () => {
            void conversations.refetch();
          },
          refreshing: conversations.isRefetching,
        })}
        ListHeaderComponent={
          <View style={{ marginBottom: spacing.sm }}>
            <PageHero
              actions={<ShellHeader actionsOnly variant="messages" />}
              highlight="Messages"
              title="Your Messages"
            />
          </View>
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
            counterpartId={item.role === 'buyer' ? item.vendorUserId : item.buyerId}
            imageUrl={item.counterpartImageUrl}
            name={item.counterpartName ?? ''}
            onPress={() => router.push({ pathname: '/chat/[conversationId]', params: { conversationId: item.id } })}
            preview={item.preview}
            previewMine={item.previewMine}
            previewRead={item.previewRead}
            time={listTime(item.lastMessageAt)}
            unreadCount={item.unreadCount}
          />
        )}
      />
    </Screen>
  );
}
