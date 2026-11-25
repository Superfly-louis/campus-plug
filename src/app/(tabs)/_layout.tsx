import { Stack } from 'expo-router';

import { colors } from '@/constants/theme';
import { useThemeMode } from '@/lib/themeMode';

export const unstable_settings = {
  initialRouteName: '(main)',
};

export default function TabStack() {
  useThemeMode();
  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
    />
  );
}
