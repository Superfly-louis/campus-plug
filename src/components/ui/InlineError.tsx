import { Text, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { colors, icon, spacing, typography } from '@/constants/theme';

type InlineErrorProps = {
  message: string;
};

export function InlineError({ message }: InlineErrorProps) {
  return (
    <View accessibilityRole="alert" style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
      <Icon name="x" size={icon.sm} color="danger" />
      <Text style={[typography.bodySmall, { color: colors.danger, flex: 1 }]}>{message}</Text>
    </View>
  );
}
