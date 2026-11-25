import { Pressable, Text, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { colors, icon, layout, limits, motion, radius, spacing, typography } from '@/constants/theme';
import { useThemeMode } from '@/lib/themeMode';

type QuantityStepperProps = {
  value: number;
  onChange: (value: number) => void;
  label: string;
};

export function QuantityStepper({ value, onChange, label }: QuantityStepperProps) {
  useThemeMode();
  const atMin = value <= 1;
  const atMax = value >= limits.orderQuantityMax;

  return (
    <View accessibilityLabel={label} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Decrease ${label}`}
        accessibilityState={{ disabled: atMin }}
        disabled={atMin}
        onPress={() => onChange(value - 1)}
        style={({ pressed }) => ({
          width: layout.minTouchTarget,
          height: layout.minTouchTarget,
          borderRadius: radius.pill,
          borderWidth: layout.borderWidth,
          borderColor: colors.border,
          backgroundColor: colors.surfaceAlt,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: atMin ? motion.disabledOpacity : pressed ? motion.pressedOpacity : 1,
        })}
      >
        <Icon name="minus" size={icon.sm} color="textPrimary" />
      </Pressable>
      <Text style={[typography.bodyMedium, { minWidth: spacing.xl, textAlign: 'center' }]}>{value}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Increase ${label}`}
        accessibilityState={{ disabled: atMax }}
        disabled={atMax}
        onPress={() => onChange(value + 1)}
        style={({ pressed }) => ({
          width: layout.minTouchTarget,
          height: layout.minTouchTarget,
          borderRadius: radius.pill,
          backgroundColor: colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: atMax ? motion.disabledOpacity : pressed ? motion.pressedOpacity : 1,
        })}
      >
        <Icon name="plus" size={icon.sm} color="textOnPrimary" />
      </Pressable>
    </View>
  );
}
