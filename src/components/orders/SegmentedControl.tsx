import { Pressable, Text, View } from 'react-native';

import { colors, layout, motion, radius, spacing, typography } from '@/constants/theme';

type Segment<T extends string> = { value: T; label: string };

type SegmentedControlProps<T extends string> = {
  options: readonly [Segment<T>, Segment<T>];
  value: T;
  onChange: (value: T) => void;
};

export function SegmentedControl<T extends string>({ options, value, onChange }: SegmentedControlProps<T>) {
  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: 'row',
        gap: spacing.xs,
        padding: spacing.xxs,
        borderRadius: radius.pill,
        backgroundColor: colors.surfaceAlt,
      }}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityLabel={option.label}
            accessibilityState={{ selected }}
            key={option.value}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => ({
              flex: 1,
              minHeight: layout.minTouchTarget,
              borderRadius: radius.pill,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: selected ? colors.primary : 'transparent',
              opacity: pressed ? motion.pressedOpacity : 1,
            })}
          >
            <Text style={[typography.button, { color: selected ? colors.textOnPrimary : colors.textPrimary }]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
