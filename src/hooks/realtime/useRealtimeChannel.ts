import type { RealtimeChannel } from '@supabase/supabase-js';
import { useIsFocused } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { supabase } from '@/lib/supabase';

export function useRealtimeActive(): boolean {
  const focused = useIsFocused();
  const [foreground, setForeground] = useState(true);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      setForeground(next === 'active');
    });
    return () => subscription.remove();
  }, []);

  return focused && foreground;
}

export function useRealtimeChannel(
  active: boolean,
  channelName: string,
  setup: (channel: RealtimeChannel) => void,
  onReconnect: () => void,
): void {
  useEffect(() => {
    if (!active) return;

    let generation = 0;
    const stored = channelGenerations.get(channelName) ?? 0;
    generation = stored + 1;
    channelGenerations.set(channelName, generation);
    if (generation > 1) onReconnect();

    let connected = false;
    let dropped = false;
    const channel = supabase.channel(channelName);
    setup(channel);
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        if (dropped) onReconnect();
        connected = true;
        dropped = false;
        return;
      }
      if (connected && (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT')) dropped = true;
    });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [active, channelName, onReconnect, setup]);
}

const channelGenerations = new Map<string, number>();
