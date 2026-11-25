import { Stack } from 'expo-router';

import { colors } from '@/constants/theme';
import { useThemeMode } from '@/lib/themeMode';

export const unstable_settings = {
  initialRouteName: 'sign-in',
};

export default function AuthLayout() {
  useThemeMode();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="sign-in" options={{ contentStyle: { backgroundColor: colors.paper } }} />
      <Stack.Screen name="sign-up" options={{ contentStyle: { backgroundColor: colors.paper } }} />
      <Stack.Screen name="verify-email" options={{ contentStyle: { backgroundColor: colors.paper } }} />
    </Stack>
  );
}
