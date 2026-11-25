import { useSegments } from 'expo-router';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { icon, spacing } from '@/constants/theme';

const captionLine = 16;

export function useTabBarInset(): number {
  const segments: readonly string[] = useSegments();
  const insets = useSafeAreaInsets();
  if (Platform.OS !== 'android' || !segments.includes('(main)')) return 0;
  const capsule =
    spacing.xxs * 2 + spacing.xxs * 2 + icon.md + spacing.xxs + captionLine;
  return spacing.xs + capsule + Math.max(insets.bottom, spacing.sm);
}
