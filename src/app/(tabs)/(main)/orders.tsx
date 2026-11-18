import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { FlatList, View } from 'react-native';

import { FilterChips } from '@/components/orders/FilterChips';
import { OrderCard } from '@/components/orders/OrderCard';
import { OrderListState } from '@/components/orders/OrderListState';
import { SegmentedControl } from '@/components/orders/SegmentedControl';
import { PageHero } from '@/components/ui/PageHero';
import { RefreshSpinner } from '@/components/ui/RefreshSpinner';
import { Screen } from '@/components/ui/Screen';
import { useTabBarInset } from '@/components/ui/TabBar';
import { ShellHeader } from '@/components/ui/ShellHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import type { OrderListFilter } from '@/constants/orderStatus';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { useOrders, useOrdersRealtime } from '@/hooks/queries/useOrders';

type Segment = 'mine' | 'incoming';

function param(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

export default function OrdersScreen() {
  const params = useLocalSearchParams<{ segment?: string | string[]; focus?: string | string[] }>();
  const focus = param(params.focus);
  const tabInset = useTabBarInset();
  const { vendor } = useAuth();
  const approved = vendor?.status === 'approved';
  const [segment, setSegment] = useState<Segment>('mine');
  const [seenFocus, setSeenFocus] = useState(focus);
  if (focus !== seenFocus) {
    setSeenFocus(focus);
    if (focus.length > 0 && param(params.segment) === 'incoming') setSegment('incoming');
  }
  const [filter, setFilter] = useState<OrderListFilter>('all');
  const role = approved && segment === 'incoming' ? 'vendor' : 'buyer';
  const orders = useOrders(role, filter);
  useOrdersRealtime();

  const rows = orders.data?.pages.flat() ?? [];
  const showRows = !orders.isPending && !orders.isError;

  return (
    <Screen>
      <FlatList contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ flexGrow: 1, paddingBottom: spacing.xl + tabInset }}
        data={showRows ? rows : []}
        keyExtractor={(item) => item.id}
        style={{ flex: 1 }}
        onEndReached={() => {
          if (orders.hasNextPage && !orders.isFetchingNextPage) void orders.fetchNextPage();
        }}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshSpinner
            onRefresh={() => {
              void orders.refetch();
            }}
            refreshing={orders.isRefetching && !orders.isFetchingNextPage}
          />
        }
        ListHeaderComponent={
          <View style={{ gap: spacing.sm, marginBottom: spacing.sm }}>
            <PageHero
              actions={<ShellHeader actionsOnly variant="orders" />}
              highlight="Orders"
              title="Your Orders"
            />
            {approved ? (
              <SegmentedControl
                onChange={setSegment}
                options={[
                  { value: 'mine', label: 'My orders' },
                  { value: 'incoming', label: 'Incoming' },
                ]}
                value={segment}
              />
            ) : null}
            <FilterChips onChange={setFilter} value={filter} />
          </View>
        }
        ListEmptyComponent={
          <OrderListState
            audience={role === 'vendor' ? 'incoming' : 'buyer'}
            empty
            error={orders.error}
            onExplore={() => router.push('/explore')}
            onRetry={() => {
              void orders.refetch();
            }}
            pending={orders.isPending}
          >
            {null}
          </OrderListState>
        }
        ListFooterComponent={orders.isFetchingNextPage ? <Skeleton height={spacing.huge} rounded="lg" /> : undefined}
        renderItem={({ item }) => (
          <OrderCard
            onPress={() => router.push({ pathname: '/order/[id]', params: { id: item.id } })}
            order={item}
            role={role}
          />
        )}
      />
    </Screen>
  );
}
