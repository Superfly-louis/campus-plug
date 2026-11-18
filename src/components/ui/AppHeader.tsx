import { View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { IconButton } from '@/components/ui/IconButton';
import { layout, spacing } from '@/constants/theme';

export type AppHeaderVariant = 'home' | 'explore' | 'orders' | 'profile';

type AppHeaderProps = {
  variant: AppHeaderVariant;
  unread?: boolean;
  name?: string | null;
  avatarUrl?: string | null;
  onBellPress?: () => void;
  onAvatarPress?: () => void;
  onSettingsPress?: () => void;
  actionsOnly?: boolean;
};

export function AppHeader({
  variant,
  unread = false,
  name,
  avatarUrl,
  onBellPress,
  onAvatarPress,
  onSettingsPress,
  actionsOnly = false,
}: AppHeaderProps) {
  const bellLabel = unread ? 'Notifications, unread' : 'Notifications';
  const showAvatar = variant === 'home' || variant === 'orders';
  const actions = (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <IconButton name="bell" accessibilityLabel={bellLabel} onPress={onBellPress} dot={unread} />
      {showAvatar ? <Avatar name={name} uri={avatarUrl} onPress={onAvatarPress} /> : null}
      {variant === 'profile' ? (
        <IconButton name="settings" accessibilityLabel="Settings" onPress={onSettingsPress} />
      ) : null}
    </View>
  );

  if (actionsOnly) return actions;

  return (
    <View
      style={{
        minHeight: layout.minTouchTarget,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: spacing.sm,
      }}
    >
      {actions}
    </View>
  );
}
