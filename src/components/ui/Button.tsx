import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { colors, control, icon, layout, motion, radius, spacing, typography } from '@/constants/theme';
import { useThemeMode } from '@/lib/themeMode';

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
  useThemeMode();
  const tone = {
    primary: {
      fill: colors.primary,
      fillPressed: colors.primaryPressed,
      text: 'textOnPrimary' as const,
      border: colors.primary,
    },
    secondary: {
      fill: colors.surfaceAlt,
      fillPressed: colors.border,
      text: 'textPrimary' as const,
      border: colors.border,
    },
    outline: {
      fill: 'transparent',
      fillPressed: colors.primarySoft,
      text: 'primary' as const,
      border: colors.primary,
    },
    ghost: {
      fill: 'transparent',
      fillPressed: colors.surfaceAlt,
      text: 'lilac' as const,
      border: 'transparent',
    },
    danger: {
      fill: colors.danger,
      fillPressed: colors.danger,
      text: 'paper' as const,
      border: colors.danger,
    },
    dangerOutline: {
      fill: 'transparent',
      fillPressed: colors.surfaceAlt,
      text: 'danger' as const,
      border: colors.danger,
    },
  }[variant];
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
