import { Text, View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/Icon';
import { colors, layout, radius, spacing, typography } from '@/constants/theme';
import { useThemeMode } from '@/lib/themeMode';

type StatusTone = 'info' | 'warning' | 'danger';

type StatusBannerProps = {
  tone: StatusTone;
  message: string;
};

const tones: Record<StatusTone, { icon: IconName; color: keyof typeof colors }> = {
  info: { icon: 'info', color: 'info' },
  warning: { icon: 'triangle-alert', color: 'warning' },
  danger: { icon: 'triangle-alert', color: 'danger' },
};

export function StatusBanner({ tone, message }: StatusBannerProps) {
  useThemeMode();
  const paint = tones[tone];
  return (
    <View
      accessibilityRole="alert"
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.sm,
        padding: spacing.md,
        borderRadius: radius.lg,
        borderWidth: layout.borderWidth,
        borderColor: colors[paint.color],
        backgroundColor: colors.surfaceAlt,
      }}
    >
      <Icon name={paint.icon} color={paint.color} />
      <Text style={[typography.body, { color: colors[paint.color], flex: 1 }]}>{message}</Text>
    </View>
  );
}
