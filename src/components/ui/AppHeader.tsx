import { Text, View } from 'react-native';

import { BrandWordmark } from '@/components/illustrations/BrandWordmark';
import { Avatar } from '@/components/ui/Avatar';
import { IconButton } from '@/components/ui/IconButton';
import { colors, layout, spacing, typography } from '@/constants/theme';

export type AppHeaderVariant = 'home' | 'explore' | 'orders' | 'profile';

type AppHeaderProps = {
  variant: AppHeaderVariant;
  unread?: boolean;
  name?: string | null;
  avatarUrl?: string | null;
  onBellPress?: () => void;
  onAvatarPress?: () => void;
  onSettingsPress?: () => void;
  onSearchPress?: () => void;
};

const tagline = ['Buy', 'Sell', 'Support Local'] as const;

function Tagline() {
  return (
    <Text style={typography.caption} numberOfLines={1}>
      {tagline.map((part, index) => (
        <Text key={part}>
          {index > 0 ? <Text style={{ color: colors.lilac }}> • </Text> : null}
          <Text style={{ color: colors.textMuted }}>{part}</Text>
        </Text>
      ))}
    </Text>
  );
}

export function AppHeader({
  variant,
  unread = false,
  name,
  avatarUrl,
  onBellPress,
  onAvatarPress,
  onSettingsPress,
  onSearchPress,
}: AppHeaderProps) {
  const bellLabel = unread ? 'Notifications, unread' : 'Notifications';
  const showAvatar = variant === 'home' || variant === 'orders';

  return (
    <View
      style={{
        minHeight: layout.minTouchTarget,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.sm,
      }}
    >
      <View style={{ flex: 1, gap: spacing.xxs }}>
        <BrandWordmark />
        {variant === 'home' ? <Tagline /> : null}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {variant === 'explore' ? (
          <IconButton name="search" accessibilityLabel="Search" onPress={onSearchPress} />
        ) : null}
        <IconButton name="bell" accessibilityLabel={bellLabel} onPress={onBellPress} dot={unread} />
        {showAvatar ? <Avatar name={name} uri={avatarUrl} onPress={onAvatarPress} /> : null}
        {variant === 'profile' ? (
          <IconButton name="settings" accessibilityLabel="Settings" onPress={onSettingsPress} />
        ) : null}
      </View>
    </View>
  );
}
