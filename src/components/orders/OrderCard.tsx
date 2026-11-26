import { Image } from 'expo-image';
import { Pressable, Text, View } from 'react-native';

import { PriceText } from '@/components/marketplace/PriceText';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { StatusPill } from '@/components/ui/StatusPill';
import { cardPaymentLabel, orderStatus } from '@/constants/orderStatus';
import { colors, icon, layout, motion, radius, spacing, typography } from '@/constants/theme';
import { formatOrderDate } from '@/lib/format';
import type { OrderListItem, OrderRole } from '@/lib/api/orders';
import { useThemeMode } from '@/lib/themeMode';

const thumb = spacing.huge + spacing.md;

type OrderCardProps = {
  order: OrderListItem;
  role: OrderRole;
  onPress: () => void;
};

export function OrderCard({ order, role, onPress }: OrderCardProps) {
  useThemeMode();
  const rawName = role === 'vendor' ? order.buyerName : order.shopName;
  const name = rawName.trim().length > 0 ? rawName : 'Deleted user';
  const title = order.extraCount > 0 ? `${order.firstTitle} + ${order.extraCount} more` : order.firstTitle;
  const when = formatOrderDate(order.createdAt);
  const paymentLabel = cardPaymentLabel(order.paymentMethod, order.paymentStatus);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${name}`}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.sm,
        borderBottomWidth: layout.borderWidth,
        borderBottomColor: colors.border,
        opacity: pressed ? motion.pressedOpacity : 1,
      })}
    >
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
      <View style={{ flex: 1, minWidth: 0, gap: spacing.xxs }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Text numberOfLines={1} style={[typography.caption, { flex: 1 }]}>
            {name}
          </Text>
          <StatusPill status={orderStatus[order.status].pill} />
        </View>
        <Text numberOfLines={1} style={typography.bodyMedium}>
          {title}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <PriceText amount={order.totalAmount} />
          {paymentLabel ? <Badge label={paymentLabel} /> : null}
          {when ? <Text style={[typography.caption, { color: colors.textMuted }]}>{when}</Text> : null}
        </View>
      </View>
      <Icon name="chevron-right" size={icon.sm} color="textMuted" />
    </Pressable>
  );
}
