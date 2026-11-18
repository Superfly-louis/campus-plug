import { router, useSegments, type Href } from 'expo-router';
import { createContext, useContext, useEffect, useRef } from 'react';
import { usePanGesture, type PanGesture } from 'react-native-gesture-handler';

const pages = ['index', 'explore', 'messages', 'orders', 'profile'] as const;

const hrefs = ['/', '/explore', '/messages', '/orders', '/profile'] as const satisfies readonly Href[];

export const TabSwipeContext = createContext<PanGesture | null>(null);

export function useTabSwipe() {
  return useContext(TabSwipeContext);
}

function tabIndex(segments: readonly string[]): number {
  if (!segments.includes('(main)')) return -1;
  const name = segments[segments.length - 1];
  if (name === '(main)' || name === 'index') return 0;
  return pages.indexOf(name as (typeof pages)[number]);
}

export function useMainTabSwipe(): PanGesture | null {
  const segments: readonly string[] = useSegments();
  const index = tabIndex(segments);
  const indexRef = useRef(index);
  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  const gesture = usePanGesture({
    enabled: index >= 0,
    activeOffsetX: [-48, 48],
    failOffsetY: [-28, 28],
    disableReanimated: true,
    runOnJS: true,
    onDeactivate: (event) => {
      if (event.canceled) return;
      const current = indexRef.current;
      if (current < 0) return;
      if (event.translationX <= -48 && current < hrefs.length - 1) {
        router.navigate(hrefs[current + 1]);
        return;
      }
      if (event.translationX >= 48 && current > 0) router.navigate(hrefs[current - 1]);
    },
  });

  return index >= 0 ? gesture : null;
}
