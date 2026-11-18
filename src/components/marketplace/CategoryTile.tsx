import { Pressable, Text, View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/Icon';
import { colors, icon, layout, motion, radius, spacing, typography } from '@/constants/theme';

type CategoryTileProps = {
  icon: IconName;
  label: string;
  active?: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
};

const plateSize = 36;

export function CategoryTile({
  icon: iconName,
  label,
  active = false,
  onPress,
  accessibilityLabel,
}: CategoryTileProps) {
  const name = label.replace('\n', ' ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? name}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: layout.minTouchTarget,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingLeft: spacing.xxs,
        paddingRight: spacing.md,
        borderRadius: radius.pill,
        borderWidth: layout.borderWidth,
        borderColor: active ? colors.primary : colors.border,
        backgroundColor: active ? colors.primary : colors.surface,
        opacity: pressed ? motion.pressedOpacity : 1,
      })}
    >
      <View
        style={{
          width: plateSize,
          height: plateSize,
          borderRadius: radius.pill,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: active ? colors.background : colors.primarySoft,
        }}
      >
        <Icon name={iconName} size={icon.md} color="primary" />
      </View>
      <Text
        numberOfLines={1}
        style={[typography.bodyMedium, { color: active ? colors.textOnPrimary : colors.textPrimary }]}
      >
        {name}
      </Text>
    </Pressable>
  );
}
