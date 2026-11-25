import { Text, View } from 'react-native';

import { colors, layout, radius, spacing, typography } from '@/constants/theme';
import { useThemeMode } from '@/lib/themeMode';

export type BadgeTone = 'lime' | 'violet' | 'food' | 'fashion' | 'tech' | 'services';

type BadgeProps = {
  label: string;
  tone?: BadgeTone;
};

export function Badge({ label, tone = 'lime' }: BadgeProps) {
  useThemeMode();
  const paint = {
    lime: { fill: colors.primary, text: colors.textOnPrimary },
    violet: { fill: colors.violet, text: colors.paper },
    food: { fill: colors.warning, text: colors.textOnPrimary },
    fashion: { fill: colors.lilac, text: colors.textOnPrimary },
    tech: { fill: colors.indigo, text: colors.paper },
    services: { fill: colors.indigo, text: colors.paper },
  }[tone];
  return (
    <View
      accessibilityLabel={label}
      style={{
        alignSelf: 'flex-start',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xxs,
        borderRadius: radius.pill,
        borderWidth: layout.borderWidth,
        borderColor: paint.fill,
        backgroundColor: paint.fill,
      }}
    >
      <Text style={[typography.caption, { color: paint.text }]}>{label}</Text>
    </View>
  );
}
