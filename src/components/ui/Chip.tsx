import { Pressable, Text } from 'react-native';

import { colors, layout, motion, radius, spacing, typography } from '@/constants/theme';

type ChipProps = {
  label: string;
  active?: boolean;
  onPress?: () => void;
};

export function Chip({ label, active = false, onPress }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active, disabled: !onPress }}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: layout.minTouchTarget,
        paddingHorizontal: spacing.md,
        borderRadius: radius.pill,
        borderWidth: layout.borderWidth,
        borderColor: active ? colors.primary : colors.border,
        backgroundColor: active ? colors.primary : colors.surfaceAlt,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? motion.pressedOpacity : 1,
      })}
    >
      <Text style={[typography.button, { color: active ? colors.textOnPrimary : colors.textPrimary }]}>{label}</Text>
    </Pressable>
  );
}

export const Pill = Chip;
