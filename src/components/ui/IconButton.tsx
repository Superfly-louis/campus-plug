import { Pressable, View } from 'react-native';

import { Icon, type IconColor, type IconName } from '@/components/ui/Icon';
import { GlassSurface, liquidGlassAvailable } from '@/components/ui/GlassSurface';
import { colors, layout, motion, radius, spacing } from '@/constants/theme';

type IconButtonProps = {
  name: IconName;
  accessibilityLabel: string;
  onPress?: () => void;
  dot?: boolean;
  color?: IconColor;
  disabled?: boolean;
};

export function IconButton({
  name,
  accessibilityLabel,
  onPress,
  dot = false,
  color = 'textPrimary',
  disabled = false,
}: IconButtonProps) {
  const glass = liquidGlassAvailable() && !disabled;

  if (glass) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled }}
        disabled={!onPress}
        onPress={onPress}
        style={{
          width: layout.minTouchTarget,
          height: layout.minTouchTarget,
          borderRadius: radius.pill,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <GlassSurface
          interactive
          effect="regular"
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            borderRadius: radius.pill,
          }}
        />
        <Icon name={name} color={color} />
        {dot ? <Dot /> : null}
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled || !onPress}
      onPress={onPress}
      style={({ pressed }) => ({
        width: layout.minTouchTarget,
        height: layout.minTouchTarget,
        borderRadius: radius.pill,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: pressed ? colors.surfaceAlt : 'transparent',
        opacity: disabled ? motion.disabledOpacity : 1,
      })}
    >
      <Icon name={name} color={color} />
      {dot ? <Dot /> : null}
    </Pressable>
  );
}

function Dot() {
  return (
    <View
      accessibilityElementsHidden
      style={{
        position: 'absolute',
        top: spacing.xs,
        right: spacing.xs,
        width: spacing.xs,
        height: spacing.xs,
        borderRadius: radius.pill,
        backgroundColor: colors.primary,
      }}
    />
  );
}
