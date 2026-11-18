import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

type PresenceValue = {
  onlineIds: ReadonlySet<string>;
};

const PresenceContext = createContext<PresenceValue>({ onlineIds: new Set() });

export function PresenceProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id ?? '';
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const [onlineIds, setOnlineIds] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      setForeground(next === 'active');
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (userId.length === 0 || !foreground) return;

    const channel = supabase.channel('presence:online', {
      config: { presence: { key: userId } },
    });
    const sync = () => {
      setOnlineIds(new Set(Object.keys(channel.presenceState())));
    };
    channel.on('presence', { event: 'sync' }, sync);
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        void channel.track({ online: true });
        sync();
      }
    });

    return () => {
      setOnlineIds(new Set());
      void supabase.removeChannel(channel);
    };
  }, [foreground, userId]);

  const value = useMemo(() => ({ onlineIds }), [onlineIds]);
  return <PresenceContext.Provider value={value}>{children}</PresenceContext.Provider>;
}

export function useOnline(userId: string | null | undefined): boolean {
  const { onlineIds } = useContext(PresenceContext);
  if (!userId) return false;
  return onlineIds.has(userId);
}
