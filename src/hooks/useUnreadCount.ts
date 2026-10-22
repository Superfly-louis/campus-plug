import { useQuery } from '@tanstack/react-query';

import { query } from '@/constants/theme';
import { queryKeys } from '@/hooks/queries/keys';
import { unreadNotificationCount } from '@/lib/api/notifications';
import { useAuth } from '@/lib/auth';

export function useUnreadCount(): number {
  const { session } = useAuth();
  const userId = session?.user.id ?? '';

  const result = useQuery({
    queryKey: queryKeys.notifications.unread(userId),
    enabled: userId.length > 0,
    refetchInterval: query.unreadRefetchMs,
    refetchOnWindowFocus: true,
    queryFn: unreadNotificationCount,
  });

  return result.data ?? 0;
}
