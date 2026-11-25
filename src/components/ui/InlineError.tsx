import { Text, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { colors, icon, spacing, typography } from '@/constants/theme';
import { useThemeMode } from '@/lib/themeMode';

type InlineErrorProps = {
  message: string;
};

export function InlineError({ message }: InlineErrorProps) {
  useThemeMode();
  return (
    <View accessibilityRole="alert" style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
      <Icon name="x" size={icon.sm} color="danger" />
      <Text style={[typography.bodySmall, { color: colors.danger, flex: 1 }]}>{message}</Text>
    </View>
  );
}
