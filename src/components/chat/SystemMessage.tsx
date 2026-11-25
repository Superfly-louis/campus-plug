import { Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/constants/theme';
import { useThemeMode } from '@/lib/themeMode';

export function SystemMessage({ body }: { body: string }) {
  useThemeMode();
  return (
    <View style={{ alignItems: 'center' }}>
      <View
        style={{
          maxWidth: '90%',
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.xs,
          borderRadius: radius.pill,
          backgroundColor: colors.surfaceAlt,
        }}
      >
        <Text style={[typography.caption, { textAlign: 'center' }]}>{body}</Text>
      </View>
    </View>
  );
}

export function DateSeparator({ label }: { label: string }) {
  useThemeMode();
  return (
    <Text accessibilityRole="header" style={[typography.caption, { textAlign: 'center' }]}>
      {label}
    </Text>
  );
}
