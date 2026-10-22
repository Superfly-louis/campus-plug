import { Text, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { colors, icon, spacing, typography } from '@/constants/theme';

export function BrandWordmark() {
  return (
    <View
      accessibilityRole="header"
      accessibilityLabel="Campus Plug"
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xxs }}
    >
      <Text style={typography.wordmark}>
        Campus<Text style={{ color: colors.primary }}>Plug</Text>
      </Text>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Icon name="zap" size={icon.sm} color="primary" />
      </View>
    </View>
  );
}
