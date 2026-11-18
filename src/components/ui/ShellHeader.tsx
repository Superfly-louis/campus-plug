import { router } from 'expo-router';

import { AppHeader, type AppHeaderVariant } from '@/components/ui/AppHeader';
import { useUnreadCount } from '@/hooks/useUnreadCount';
import { getImageUrl } from '@/lib/images';
import { useAuth } from '@/lib/auth';

export function ShellHeader({
  variant,
  actionsOnly = false,
}: {
  variant: AppHeaderVariant;
  actionsOnly?: boolean;
}) {
  const { profile } = useAuth();
  const unread = useUnreadCount();

  return (
    <AppHeader
      avatarUrl={getImageUrl('avatars', profile?.avatar_url)}
      name={profile?.full_name}
      onAvatarPress={() => router.push('/profile')}
      onBellPress={() => router.push('/notifications')}
      onSettingsPress={() => router.push('/settings')}
      actionsOnly={actionsOnly}
      unread={unread > 0}
      variant={variant}
    />
  );
}
