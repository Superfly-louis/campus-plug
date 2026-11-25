import { Text, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { colors, icon, layout, radius, spacing, typography } from '@/constants/theme';
import { useThemeMode } from '@/lib/themeMode';

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'completed' | 'declined' | 'cancelled';

type StatusPillProps = {
  status: OrderStatus;
};

const labels: Record<OrderStatus, string> = {
  pending: 'Pending',
  preparing: 'Preparing',
  ready: 'Ready',
  completed: 'Completed',
  declined: 'Declined',
  cancelled: 'Cancelled',
};

export function StatusPill({ status }: StatusPillProps) {
  useThemeMode();
  const filled = status === 'pending' || status === 'preparing' || status === 'ready';
  const backgroundColor = status === 'pending' ? colors.warning : filled ? colors.violet : 'transparent';
  const borderColor =
    status === 'completed' ? colors.primary : status === 'declined' || status === 'cancelled' ? colors.danger : backgroundColor;
  const textColor =
    status === 'pending'
      ? colors.textOnPrimary
      : status === 'completed'
        ? colors.primary
        : status === 'declined' || status === 'cancelled'
          ? colors.danger
          : colors.paper;

  return (
    <View
      accessibilityLabel={labels[status]}
      style={{
        alignSelf: 'flex-start',
        minHeight: spacing.xxl,
        paddingHorizontal: spacing.sm,
        borderRadius: radius.pill,
        borderWidth: layout.borderWidth,
        borderColor,
        backgroundColor,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xxs,
      }}
    >
      {status === 'completed' ? <Icon name="check" size={icon.sm} color="primary" /> : null}
      <Text style={[typography.button, { color: textColor }]}>{labels[status]}</Text>
    </View>
  );
}
