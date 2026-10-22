import { Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/constants/theme';

export function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  const label = count > 99 ? '99+' : String(count);
  return (
    <View
      accessibilityLabel={`${label} unread`}
      style={{
        minWidth: spacing.xl,
        height: spacing.xl,
        paddingHorizontal: spacing.xs,
        borderRadius: radius.pill,
        backgroundColor: colors.violet,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={[typography.caption, { color: colors.textPrimary }]}>{label}</Text>
    </View>
  );
}
