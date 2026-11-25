import { Image } from 'expo-image';
import { Pressable, Text, View } from 'react-native';

import { colors, control, layout, motion, radius, spacing, typography } from '@/constants/theme';
import { useThemeMode } from '@/lib/themeMode';

type AvatarSize = 'md' | 'lg';

type AvatarProps = {
  name?: string | null;
  uri?: string | null;
  size?: AvatarSize;
  online?: boolean;
  onPress?: () => void;
};

const sizes: Record<AvatarSize, number> = {
  md: layout.minTouchTarget,
  lg: control.avatarLg,
};

function initials(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.charAt(0) ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.charAt(0) ?? '') : '';
  const letters = `${first}${last}`.toUpperCase();
  return letters.length > 0 ? letters : '?';
}

export function Avatar({ name, uri, size = 'md', online = false, onPress }: AvatarProps) {
  useThemeMode();
  const dimension = sizes[size];
  const inner = dimension - layout.ringWidth * 2;
  const photo = uri?.trim() ? uri.trim() : null;
  const label = name?.trim() || 'Profile photo';

  const face = (
    <View
      style={{
        width: dimension,
        height: dimension,
        borderRadius: radius.pill,
        borderWidth: layout.ringWidth,
        borderColor: colors.lilac,
        backgroundColor: colors.indigo,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {photo ? (
        <Image
          source={{ uri: photo }}
          contentFit="cover"
          style={{ width: inner, height: inner, borderRadius: radius.pill }}
        />
      ) : (
        <Text style={[size === 'lg' ? typography.h2 : typography.button, { color: colors.paper }]}>{initials(name)}</Text>
      )}
      {online ? (
        <View
          accessibilityLabel="Online"
          style={{
            position: 'absolute',
            right: 0,
            bottom: 0,
            width: spacing.sm,
            height: spacing.sm,
            borderRadius: radius.pill,
            backgroundColor: colors.primary,
            borderWidth: layout.borderWidth,
            borderColor: colors.background,
          }}
        />
      ) : null}
    </View>
  );

  if (!onPress) {
    return (
      <View accessibilityRole="image" accessibilityLabel={label}>
        {face}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? motion.pressedOpacity : 1 })}
    >
      {face}
    </Pressable>
  );
}
