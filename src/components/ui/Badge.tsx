import { Text, View } from 'react-native';

import { colors, layout, radius, spacing, typography } from '@/constants/theme';

export type BadgeTone = 'lime' | 'violet' | 'food' | 'fashion' | 'tech' | 'services';

type BadgeProps = {
  label: string;
  tone?: BadgeTone;
};

const tones: Record<BadgeTone, { fill: string; text: string }> = {
  lime: { fill: colors.primary, text: colors.textOnPrimary },
  violet: { fill: colors.violet, text: colors.textPrimary },
  food: { fill: colors.warning, text: colors.textOnPrimary },
  fashion: { fill: colors.lilac, text: colors.textOnPrimary },
  tech: { fill: colors.indigo, text: colors.textPrimary },
  services: { fill: colors.indigoDeep, text: colors.textPrimary },
};

export function Badge({ label, tone = 'lime' }: BadgeProps) {
  const paint = tones[tone];
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
