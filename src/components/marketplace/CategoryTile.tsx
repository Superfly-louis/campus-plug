import { Pressable, Text } from 'react-native';

import { Icon, type IconName } from '@/components/ui/Icon';
import { colors, icon, marketplace, motion, radius, spacing, typography } from '@/constants/theme';

type CategoryTileProps = {
  icon: IconName;
  label: string;
  active?: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
};

export function CategoryTile({
  icon: iconName,
  label,
  active = false,
  onPress,
  accessibilityLabel,
}: CategoryTileProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label.replace('\n', ' ')}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => ({
        width: marketplace.categoryTileWidth,
        height: marketplace.categoryTileHeight,
        borderRadius: radius.lg,
        paddingHorizontal: spacing.xs,
        paddingVertical: spacing.xxs,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xxs,
        backgroundColor: active ? colors.primary : colors.indigo,
        opacity: pressed ? motion.pressedOpacity : 1,
      })}
    >
      <Icon name={iconName} size={icon.sm} color={active ? 'textOnPrimary' : 'lilac'} />
      <Text
        adjustsFontSizeToFit
        minimumFontScale={0.85}
        numberOfLines={2}
        style={{
          width: '100%',
          fontFamily: typography.caption.fontFamily,
          fontSize: 11,
          lineHeight: 13,
          color: active ? colors.textOnPrimary : colors.lilac,
          textAlign: 'center',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
