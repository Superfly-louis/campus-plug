import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Text, View } from 'react-native';

import { OrderTimeline } from '@/components/orders/OrderTimeline';
import { OrderDetailState } from '@/components/orders/OrderListState';
import { PriceText } from '@/components/marketplace/PriceText';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { IconButton } from '@/components/ui/IconButton';
import { InlineError } from '@/components/ui/InlineError';
import { Screen } from '@/components/ui/Screen';
import { StatusPill } from '@/components/ui/StatusPill';
import { actionStatus, orderStatus, type OrderAction } from '@/constants/orderStatus';
import { colors, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { toFriendlyError } from '@/lib/errors';
import { useOrder, useOrdersRealtime, useUpdateOrderStatus } from '@/hooks/queries/useOrders';

function param(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

const actionLabels: Record<OrderAction, string> = {
  accept: 'Accept',
  reject: 'Decline',
  ready: 'Mark ready',
  complete: 'Mark completed',
  cancel: 'Cancel order',
};

const confirms: Record<OrderAction, { title: string; body: string }> = {
  accept: { title: 'Accept this order?', body: 'The buyer will see it as preparing.' },
  reject: { title: 'Decline this order?', body: 'The buyer will see this order as declined.' },
  ready: { title: 'Mark this order ready?', body: 'The buyer can meet you at the meeting point.' },
  complete: { title: 'Mark this order completed?', body: 'This finishes the order.' },
  cancel: { title: 'Cancel this order?', body: 'This cannot be undone.' },
};

function isDestructive(action: OrderAction): boolean {
  return action === 'reject' || action === 'cancel';
}

export default function OrderDetailScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = param(params.id);
  const { session } = useAuth();
  const order = useOrder(id);
  const update = useUpdateOrderStatus();
  useOrdersRealtime();
  const [busy, setBusy] = useState<OrderAction | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const detail = order.data;
  const userId = session?.user.id;
  const isVendor = Boolean(userId && detail?.order.vendorUserId === userId);
  const isBuyer = Boolean(userId && detail?.order.buyerId === userId);
  const actions = detail
    ? isVendor
      ? orderStatus[detail.order.status].vendorActions
      : isBuyer
        ? orderStatus[detail.order.status].buyerActions
        : []
    : [];

  function confirm(action: OrderAction) {
    if (!detail) return;
    const copy = confirms[action];
    Alert.alert(copy.title, copy.body, [
      { text: 'Not now', style: 'cancel' },
      {
        text: action === 'cancel' && isVendor ? 'Cancel' : actionLabels[action],
        style: isDestructive(action) ? 'destructive' : 'default',
        onPress: () => {
          setActionError(null);
          setBusy(action);
          update.mutate(
            { orderId: detail.order.id, status: actionStatus[action] },
            {
              onError: (error) => setActionError(toFriendlyError(error)),
              onSettled: () => setBusy(null),
            },
          );
        },
      },
    ]);
  }

  const heading = detail
    ? isVendor
      ? detail.order.buyerName.trim() || 'Deleted user'
      : detail.order.shopName.trim() || 'Deleted user'
    : '';
  const counterpartName = detail?.counterpart.name?.trim() || 'Deleted user';

  return (
    <Screen
      onRefresh={() => {
        void order.refetch();
      }}
      refreshing={order.isRefetching && !order.isPending}
      scroll
    >
      <IconButton accessibilityLabel="Go back" name="chevron-left" onPress={() => router.back()} />
      <OrderDetailState
        error={order.error}
        missing={id.length === 0 || (!order.isPending && !order.isError && !detail)}
        onRetry={() => {
          void order.refetch();
        }}
        pending={id.length > 0 && order.isPending}
      >
        {detail ? (
          <View style={{ gap: spacing.lg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
              <Text style={[typography.h2, { flex: 1 }]}>{heading}</Text>
              <StatusPill status={orderStatus[detail.order.status].pill} />
            </View>
            <OrderTimeline status={detail.order.status} />
            <Card>
              {detail.items.length === 0 ? (
                <Text style={typography.body}>No items on this order.</Text>
              ) : (
                detail.items.map((item) => (
                  <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                    <Text numberOfLines={2} style={[typography.body, { flex: 1 }]}>
                      {item.title}
                    </Text>
                    <Text style={typography.caption}>{`× ${item.quantity}`}</Text>
                    <PriceText amount={item.unitPrice} />
                  </View>
                ))
              )}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={typography.bodyMedium}>Total</Text>
                <PriceText amount={detail.order.totalAmount} />
              </View>
            </Card>
            <Card>
              <Text style={typography.bodyMedium}>Cash on delivery</Text>
              <View style={{ gap: spacing.xxs }}>
                <Text style={typography.caption}>Meeting point</Text>
                <Text style={typography.body}>
                  {detail.order.meetingPoint ?? 'No meeting point was set.'}
                </Text>
              </View>
              {detail.order.buyerNote ? (
                <View style={{ gap: spacing.xxs }}>
                  <Text style={typography.caption}>Note</Text>
                  <Text style={typography.body}>{detail.order.buyerNote}</Text>
                </View>
              ) : null}
            </Card>
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <Avatar name={counterpartName} uri={detail.counterpart.imageUrl} />
                <Text style={[typography.bodyMedium, { flex: 1 }]}>{counterpartName}</Text>
              </View>
            </Card>
            {detail.conversationId ? (
              <Button
                label="Open chat"
                onPress={() =>
                  router.push({
                    pathname: '/chat/[conversationId]',
                    params: { conversationId: detail.conversationId ?? '' },
                  })
                }
                variant="outline"
              />
            ) : (
              <Text style={[typography.body, { color: colors.textMuted }]}>Chat unavailable</Text>
            )}
            {actions.length > 0 ? (
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                {actions.map((action) => (
                  <View key={action} style={{ flex: 1 }}>
                    <Button
                      disabled={busy != null}
                      label={action === 'cancel' && isVendor ? 'Cancel' : actionLabels[action]}
                      loading={busy === action}
                      onPress={() => confirm(action)}
                      variant={isDestructive(action) ? 'dangerOutline' : 'primary'}
                    />
                  </View>
                ))}
              </View>
            ) : null}
            {actionError ? <InlineError message={actionError} /> : null}
          </View>
        ) : null}
      </OrderDetailState>
    </Screen>
  );
}
