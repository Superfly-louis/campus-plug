import { Text, View } from 'react-native';

import { colors, layout, spacing, typography } from '@/constants/theme';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

export function OfflineBanner() {
  const { offline } = useNetworkStatus();

  if (!offline) return null;

  return (
    <View
      accessibilityRole="alert"
      style={{
        paddingHorizontal: layout.screenPadding,
        paddingVertical: spacing.sm,
        backgroundColor: colors.warning,
      }}
    >
      <Text style={[typography.bodySmall, { color: colors.textOnPrimary }]}>
        You are offline. Some actions will fail until the connection returns.
      </Text>
    </View>
  );
}
