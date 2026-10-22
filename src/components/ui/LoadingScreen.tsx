import { ActivityIndicator, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/constants/theme';

type LoadingScreenProps = {
  label?: string;
};

export function LoadingScreen({ label = 'Loading' }: LoadingScreenProps) {
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md }}
    >
      <ActivityIndicator color={colors.primary} size="large" />
      <Text style={[typography.body, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}
