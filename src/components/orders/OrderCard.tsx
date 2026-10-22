import { Image } from 'expo-image';
import { Text, View } from 'react-native';

import { OrderTimeline } from '@/components/orders/OrderTimeline';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { StatusPill } from '@/components/ui/StatusPill';
import { PriceText } from '@/components/marketplace/PriceText';
import { orderStatus } from '@/constants/orderStatus';
import { colors, icon, layout, radius, spacing, typography } from '@/constants/theme';
import { formatOrderDate } from '@/lib/format';
import type { OrderListItem, OrderRole } from '@/lib/api/orders';

const thumb = spacing.huge + spacing.xl;

type OrderCardProps = {
  order: OrderListItem;
  role: OrderRole;
  onPress: () => void;
};

function statusLine(order: OrderListItem): string | null {
  if (order.status === 'pending') return 'Waiting for vendor confirmation…';
  if (order.status === 'ready') {
    return order.meetingPoint ? `Ready at ${order.meetingPoint}` : 'Ready for pickup.';
  }
  if (order.status === 'completed') return `Completed on ${formatOrderDate(order.updatedAt)}`;
  if (order.status === 'rejected') return 'The vendor declined this order.';
  if (order.status === 'cancelled') return 'This order was cancelled.';
  return null;
}

export function OrderCard({ order, role, onPress }: OrderCardProps) {
  const rawName = role === 'vendor' ? order.buyerName : order.shopName;
  const name = rawName.trim().length > 0 ? rawName : 'Deleted user';
  const title = order.extraCount > 0 ? `${order.firstTitle} + ${order.extraCount} more` : order.firstTitle;
  const itemLabel = order.itemCount === 1 ? '1 item' : `${order.itemCount} items`;
  const line = statusLine(order);
  const showTimeline = order.status === 'accepted' || order.status === 'ready';

  return (
    <Card>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <View style={{ width: thumb, height: thumb }}>
          {order.imageUrl ? (
            <Image
              source={{ uri: order.imageUrl }}
              contentFit="cover"
              accessibilityLabel={order.firstTitle}
              style={{ width: thumb, height: thumb, borderRadius: radius.lg }}
            />
          ) : (
            <View
              accessibilityLabel="No product photo"
              style={{
                width: thumb,
                height: thumb,
                borderRadius: radius.lg,
                backgroundColor: colors.surfaceAlt,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="package" color="lilac" />
            </View>
          )}
          <View
            style={{
              position: 'absolute',
              left: 0,
              bottom: 0,
              width: spacing.xxl,
              height: spacing.xxl,
              borderRadius: radius.pill,
              borderWidth: layout.ringWidth,
              borderColor: colors.background,
              backgroundColor: colors.indigoDeep,
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            {order.vendorLogoUrl ? (
              <Image
                source={{ uri: order.vendorLogoUrl }}
                contentFit="cover"
                accessibilityLabel={`${name} logo`}
                style={{ width: spacing.xxl, height: spacing.xxl }}
              />
            ) : (
              <Icon name="store" size={icon.sm} color="lilac" />
            )}
          </View>
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: spacing.xxs }}>
          <Text style={typography.caption} numberOfLines={1}>
            {name}
          </Text>
          <Text style={typography.bodyMedium} numberOfLines={2}>
            {title}
          </Text>
          <PriceText amount={order.totalAmount} />
          <Text style={typography.caption}>{`Ordered on ${formatOrderDate(order.createdAt)} · ${itemLabel}`}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xxs }}>
          <StatusPill status={orderStatus[order.status].pill} />
          <Icon name="chevron-right" size={icon.sm} color="textMuted" />
        </View>
      </View>
      {line ? <Text style={[typography.bodySmall, { color: colors.textMuted }]}>{line}</Text> : null}
      {showTimeline ? <OrderTimeline status={order.status} /> : null}
      <Button label="View Details" onPress={onPress} variant="outline" size="md" fullWidth={false} />
    </Card>
  );
}
