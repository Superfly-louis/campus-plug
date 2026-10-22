import { Image } from 'expo-image';
import { Pressable, Text, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { colors, layout, motion, radius, spacing, typography } from '@/constants/theme';

type ShopLogoFieldProps = {
  uri: string | null;
  onPress: () => void;
  disabled?: boolean;
};

const tile = spacing.huge * 2;

export function ShopLogoField({ uri, onPress, disabled = false }: ShopLogoFieldProps) {
  const label = uri ? 'Change logo' : 'Add logo';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        alignSelf: 'flex-start',
        alignItems: 'center',
        gap: spacing.xs,
        opacity: disabled ? motion.disabledOpacity : pressed ? motion.pressedOpacity : 1,
      })}
    >
      <View
        style={{
          width: tile,
          height: tile,
          borderRadius: radius.lg,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: layout.borderWidth,
          borderColor: colors.border,
          backgroundColor: colors.surfaceAlt,
        }}
      >
        {uri ? (
          <Image source={{ uri }} contentFit="cover" style={{ width: '100%', height: '100%' }} />
        ) : (
          <Icon name="plus" color="lilac" />
        )}
      </View>
      <Text style={[typography.caption, { color: colors.lilac }]}>{label}</Text>
    </Pressable>
  );
}
