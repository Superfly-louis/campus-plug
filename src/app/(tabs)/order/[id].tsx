import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Text, View } from 'react-native';

import { OrderReviewCard } from '@/components/orders/OrderReviewCard';
import { OrderTimeline } from '@/components/orders/OrderTimeline';
import { OrderDetailState } from '@/components/orders/OrderListState';
import { PriceText } from '@/components/marketplace/PriceText';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon, type IconName } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { InlineError } from '@/components/ui/InlineError';
import { Screen } from '@/components/ui/Screen';
import { StatusPill } from '@/components/ui/StatusPill';
import { actionStatus, orderStatus, type DbOrderStatus, type OrderAction } from '@/constants/orderStatus';
import { colors, icon, layout, radius, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { toFriendlyError } from '@/lib/errors';
import { useOrder, useOrdersRealtime, useUpdateOrderStatus } from '@/hooks/queries/useOrders';
import { useThemeMode } from '@/lib/themeMode';

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

const progressCopy: Record<DbOrderStatus, { buyer: string; vendor: string }> = {
  pending: {
    buyer: 'Waiting for the shop to accept.',
    vendor: 'Accept this order to start preparing it.',
  },
  accepted: {
    buyer: 'The shop is preparing your order.',
    vendor: 'Preparing. Mark it ready when it can be picked up.',
  },
  ready: {
    buyer: 'Ready for you at the meeting point.',
    vendor: 'Ready for pickup. Mark it completed after handover.',
  },
  completed: {
    buyer: 'This order is complete.',
    vendor: 'This order is complete.',
  },
  rejected: {
    buyer: 'The shop declined this order.',
    vendor: 'You declined this order.',
  },
  cancelled: {
    buyer: 'This order was cancelled.',
    vendor: 'This order was cancelled.',
  },
};

function DetailRow({ icon: iconName, label, value }: { icon: IconName; label: string; value: string }) {
  useThemeMode();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
      <View
        style={{
          width: spacing.xxxl,
          height: spacing.xxxl,
          borderRadius: radius.pill,
          backgroundColor: colors.surfaceAlt,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon color="lilac" name={iconName} size={icon.sm} />
      </View>
      <View style={{ flex: 1, gap: spacing.xxs }}>
        <Text style={typography.caption}>{label}</Text>
        <Text style={typography.body}>{value}</Text>
      </View>
    </View>
  );
}

export default function OrderDetailScreen() {
  useThemeMode();
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
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
        <IconButton accessibilityLabel="Go back" name="chevron-left" onPress={() => router.back()} />
        <Text accessibilityRole="header" style={typography.h1}>
          Order
        </Text>
      </View>
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
            <View style={{ gap: spacing.xs }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
                <Text style={[typography.h2, { flex: 1 }]}>{heading}</Text>
                <StatusPill status={orderStatus[detail.order.status].pill} />
              </View>
              <Text style={typography.bodySmall}>{progressCopy[detail.order.status][isVendor ? 'vendor' : 'buyer']}</Text>
            </View>
            <Card>
              <OrderTimeline status={detail.order.status} />
            </Card>
            {isBuyer && detail.order.status === 'completed' ? <OrderReviewCard orderId={detail.order.id} /> : null}
            <Card>
              {detail.items.length === 0 ? (
                <Text style={typography.body}>No items on this order.</Text>
              ) : (
                detail.items.map((item) => (
                  <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                    <Text numberOfLines={2} style={[typography.bodyMedium, { flex: 1 }]}>
                      {item.title}
                    </Text>
                    <Text style={typography.caption}>{`× ${item.quantity}`}</Text>
                    <PriceText amount={item.unitPrice} />
                  </View>
                ))
              )}
              <View style={{ height: layout.borderWidth, backgroundColor: colors.border }} />
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={typography.bodyMedium}>Total</Text>
                <PriceText amount={detail.order.totalAmount} />
              </View>
            </Card>
            <Card>
              <DetailRow icon="clipboard-check" label="Payment" value="Cash on delivery" />
              <DetailRow
                icon="map-pin"
                label="Meeting point"
                value={detail.order.meetingPoint ?? 'No meeting point was set.'}
              />
              {detail.order.buyerNote ? <DetailRow icon="message-circle" label="Note" value={detail.order.buyerNote} /> : null}
            </Card>
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <Avatar name={counterpartName} uri={detail.counterpart.imageUrl} />
                <View style={{ flex: 1, gap: spacing.xxs }}>
                  <Text style={typography.caption}>{isVendor ? 'Buyer' : 'Shop'}</Text>
                  <Text style={typography.bodyMedium}>{counterpartName}</Text>
                </View>
              </View>
              {detail.conversationId ? (
                <Button
                  label="Open chat"
                  onPress={() =>
                    router.push({
                      pathname: '/chat/[conversationId]',
                      params: { conversationId: detail.conversationId ?? '' },
                    })
                  }
                  size="md"
                  variant="outline"
                />
              ) : (
                <Text style={typography.bodySmall}>Chat unavailable</Text>
              )}
            </Card>
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
