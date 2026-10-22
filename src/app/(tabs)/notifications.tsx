import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Text, View } from 'react-native';

import { MarketplaceState } from '@/components/marketplace/MarketplaceState';
import type { IconName } from '@/components/ui/Icon';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { InlineError } from '@/components/ui/InlineError';
import { ListRow } from '@/components/ui/ListRow';
import { Screen } from '@/components/ui/Screen';
import { useTabBarInset } from '@/components/ui/TabBar';
import { Skeleton } from '@/components/ui/Skeleton';
import { spacing, typography } from '@/constants/theme';
import { useMarkNotificationRead, useNotifications, useNotificationsRealtime } from '@/hooks/queries/useNotifications';
import type { AppNotification } from '@/lib/api/notifications';
import { toFriendlyError } from '@/lib/errors';
import { formatDateTime } from '@/lib/format';

import type { Json } from '../../../types/database.types';

function textValue(data: Json, key: string): string {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return '';
  const value = data[key];
  return typeof value === 'string' ? value : '';
}

function iconFor(type: string): IconName {
  if (type === 'message') return 'message-circle';
  if (type === 'order_placed' || type === 'order_status') return 'clipboard-check';
  if (type === 'vendor_reviewed' || type === 'vendor_removed') return 'store';
  if (type === 'product_moderated') return 'package';
  return 'bell';
}

function openNotification(item: AppNotification) {
  const orderId = textValue(item.data, 'order_id');
  const conversationId = textValue(item.data, 'conversation_id');
  const productId = textValue(item.data, 'product_id');
  if ((item.type === 'order_placed' || item.type === 'order_status') && orderId) {
    router.push({ pathname: '/order/[id]', params: { id: orderId } });
    return;
  }
  if (item.type === 'message' && conversationId) {
    router.push({ pathname: '/chat/[conversationId]', params: { conversationId } });
    return;
  }
  if (item.type === 'vendor_reviewed' || item.type === 'vendor_removed') {
    router.push('/my-shop');
    return;
  }
  if (item.type === 'product_moderated' && productId) {
    router.push({ pathname: '/vendor/product-form', params: { id: productId } });
  }
}

export default function NotificationsScreen() {
  const tabInset = useTabBarInset();
  const notifications = useNotifications();
  const markRead = useMarkNotificationRead();
  useNotificationsRealtime();
  const [error, setError] = useState<string | null>(null);
  const rows = notifications.data?.pages.flat() ?? [];
  const showRows = !notifications.isPending && !notifications.isError;

  function open(item: AppNotification) {
    if (item.readAt) {
      openNotification(item);
      return;
    }
    setError(null);
    markRead.mutate(item.id, {
      onSuccess: () => openNotification(item),
      onError: (caught) => setError(toFriendlyError(caught)),
    });
  }

  return (
    <Screen>
      <FlatList contentInsetAdjustmentBehavior="never"
        contentContainerStyle={{ flexGrow: 1, gap: spacing.xs, paddingBottom: spacing.xl + tabInset }}
        data={showRows ? rows : []}
        keyExtractor={(item) => item.id}
        style={{ flex: 1 }}
        onEndReached={() => {
          if (notifications.hasNextPage && !notifications.isFetchingNextPage) void notifications.fetchNextPage();
        }}
        onEndReachedThreshold={0.4}
        onRefresh={() => {
          void notifications.refetch();
        }}
        refreshing={notifications.isRefetching && !notifications.isFetchingNextPage}
        ListHeaderComponent={
          <View style={{ gap: spacing.sm, marginBottom: spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <IconButton accessibilityLabel="Go back" name="chevron-left" onPress={() => router.back()} />
              <Text style={typography.h1}>Notifications</Text>
            </View>
            {error ? <InlineError message={error} /> : null}
          </View>
        }
        ListEmptyComponent={
          notifications.isPending ? (
            <MarketplaceState status="loading" />
          ) : notifications.isError ? (
            <MarketplaceState
              message={toFriendlyError(notifications.error)}
              onRetry={() => {
                void notifications.refetch();
              }}
              status="error"
            />
          ) : (
            <EmptyState
              body="Updates about orders and your shop will show up here."
              icon="bell"
              title="No notifications yet"
            />
          )
        }
        ListFooterComponent={
          notifications.isFetchingNextPage ? <Skeleton height={spacing.huge} rounded="lg" /> : null
        }
        renderItem={({ item }) => (
          <ListRow
            detail={formatDateTime(item.createdAt)}
            highlighted={item.readAt == null}
            icon={iconFor(item.type)}
            onPress={() => open(item)}
            subtitle={item.body}
            title={item.title}
          />
        )}
      />
    </Screen>
  );
}
