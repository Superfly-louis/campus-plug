import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { Icon, type IconColor } from '@/components/ui/Icon';
import { colors, control, icon, layout, motion, radius, spacing, typography } from '@/constants/theme';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'dangerOutline';
type ButtonSize = 'md' | 'lg';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  trailingArrow?: boolean;
  fullWidth?: boolean;
};

const tones: Record<ButtonVariant, { fill: string; fillPressed: string; text: IconColor; border: string }> = {
  primary: {
    fill: colors.primary,
    fillPressed: colors.primaryPressed,
    text: 'textOnPrimary',
    border: colors.primary,
  },
  secondary: {
    fill: colors.surfaceAlt,
    fillPressed: colors.indigoDeep,
    text: 'textPrimary',
    border: colors.border,
  },
  outline: {
    fill: 'transparent',
    fillPressed: colors.primarySoft,
    text: 'primary',
    border: colors.primary,
  },
  ghost: {
    fill: 'transparent',
    fillPressed: colors.surfaceAlt,
    text: 'lilac',
    border: 'transparent',
  },
  danger: {
    fill: colors.danger,
    fillPressed: colors.danger,
    text: 'textPrimary',
    border: colors.danger,
  },
  dangerOutline: {
    fill: 'transparent',
    fillPressed: colors.surfaceAlt,
    text: 'danger',
    border: colors.danger,
  },
};

const heights: Record<ButtonSize, number> = {
  md: layout.minTouchTarget,
  lg: control.buttonLg,
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'lg',
  loading = false,
  disabled = false,
  trailingArrow = false,
  fullWidth = true,
}: ButtonProps) {
  const tone = tones[variant];
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: heights[size],
        paddingHorizontal: spacing.xl,
        borderRadius: radius.pill,
        borderWidth: layout.borderWidth,
        borderColor: tone.border,
        backgroundColor: pressed && !inactive ? tone.fillPressed : tone.fill,
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: fullWidth ? 'stretch' : 'flex-start',
        opacity: disabled ? motion.disabledOpacity : pressed ? motion.pressedOpacity : 1,
      })}
    >
      {loading ? (
        <ActivityIndicator color={colors[tone.text]} />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <Text style={[typography.button, { color: colors[tone.text] }]}>{label}</Text>
          {trailingArrow ? <Icon name="arrow-right" size={icon.sm} color={tone.text} /> : null}
        </View>
      )}
    </Pressable>
  );
}
