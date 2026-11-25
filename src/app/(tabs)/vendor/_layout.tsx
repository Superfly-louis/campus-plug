import { Stack } from 'expo-router';

import { colors } from '@/constants/theme';
import { useThemeMode } from '@/lib/themeMode';

export default function VendorLayout() {
  useThemeMode();
  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
    />
  );
}
