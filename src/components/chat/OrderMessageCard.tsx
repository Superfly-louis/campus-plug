import { Pressable, Text, View } from 'react-native';

import { PriceText } from '@/components/marketplace/PriceText';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatusPill } from '@/components/ui/StatusPill';
import { orderStatus } from '@/constants/orderStatus';
import { colors, spacing, typography } from '@/constants/theme';
import { useOrder } from '@/hooks/queries/useOrders';

type OrderMessageCardProps = {
  orderId: string | null;
  body: string;
  onPress: (orderId: string) => void;
};

export function OrderMessageCard({ orderId, body, onPress }: OrderMessageCardProps) {
  const order = useOrder(orderId ?? '');
  const detail = order.data;
  const first = detail?.items[0];
  const extra = detail ? Math.max(detail.items.length - 1, 0) : 0;
  const summary = first ? (extra > 0 ? `${first.title} + ${extra} more` : first.title) : body;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open order"
      disabled={!orderId || !detail}
      onPress={() => {
        if (orderId) onPress(orderId);
      }}
    >
      <Card>
        <Text style={typography.bodyMedium}>{summary}</Text>
        {order.isPending ? <Skeleton height={spacing.xl} width={spacing.huge * 2} rounded="pill" /> : null}
        {detail ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
            <PriceText amount={detail.order.totalAmount} />
            <StatusPill status={orderStatus[detail.order.status].pill} />
          </View>
        ) : null}
        {order.isError || (order.isSuccess && !detail) ? (
          <Text style={[typography.caption, { color: colors.textMuted }]}>This order is no longer available.</Text>
        ) : null}
      </Card>
    </Pressable>
  );
}
