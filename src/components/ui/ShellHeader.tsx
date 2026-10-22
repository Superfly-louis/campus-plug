import { router } from 'expo-router';

import { AppHeader, type AppHeaderVariant } from '@/components/ui/AppHeader';
import { useUnreadCount } from '@/hooks/useUnreadCount';
import { getImageUrl } from '@/lib/images';
import { useAuth } from '@/lib/auth';

export function ShellHeader({ variant }: { variant: AppHeaderVariant }) {
  const { profile } = useAuth();
  const unread = useUnreadCount();

  return (
    <AppHeader
      avatarUrl={getImageUrl('avatars', profile?.avatar_url)}
      name={profile?.full_name}
      onAvatarPress={() => router.push('/profile')}
      onBellPress={() => router.push('/notifications')}
      onSearchPress={() => router.push('/search')}
      onSettingsPress={() => router.push('/settings')}
      unread={unread > 0}
      variant={variant}
    />
  );
}
