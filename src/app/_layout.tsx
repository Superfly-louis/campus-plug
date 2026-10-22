import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { AppState, Platform, Pressable, Text, View } from 'react-native';

import { ErrorBoundary } from '@/components/AppErrorBoundary';
import { Button } from '@/components/ui/Button';
import { InlineError } from '@/components/ui/InlineError';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { Screen } from '@/components/ui/Screen';
import { colors, layout, query, spacing, typography } from '@/constants/theme';
import { useAppFonts } from '@/hooks/useAppFonts';
import { AuthProvider, useAuth } from '@/lib/auth';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

SplashScreen.preventAutoHideAsync();
void SystemUI.setBackgroundColorAsync(colors.background);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: query.staleTimeMs,
      retry: query.retry,
    },
  },
});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useAppFonts();
  const fontsReady = fontsLoaded || fontError != null;

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void supabase.auth.startAutoRefresh();
      else void supabase.auth.stopAutoRefresh();
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    return focusManager.setEventListener((handleFocus) => {
      const subscription = AppState.addEventListener('change', (state) => {
        handleFocus(state === 'active');
      });
      return () => subscription.remove();
    });
  }, []);

  const app = isSupabaseConfigured ? (
    <AuthProvider>
      <RootNavigator fontsReady={fontsReady} />
    </AuthProvider>
  ) : (
    <SetupRequired fontsReady={fontsReady} />
  );

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>{app}</QueryClientProvider>
    </ErrorBoundary>
  );
}

function SetupRequired({ fontsReady }: { fontsReady: boolean }) {
  useEffect(() => {
    if (fontsReady) void SplashScreen.hideAsync();
  }, [fontsReady]);

  if (!fontsReady) return null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style="light" />
      <Screen>
        <Text style={typography.h1}>Connect Supabase</Text>
        <Text style={[typography.body, { color: colors.textMuted }]}>
          Copy .env.example to .env. Add the project URL and anon key from the Supabase dashboard
          under Project Settings, then API. Restart Expo after saving the file.
        </Text>
      </Screen>
    </View>
  );
}

function RootNavigator({ fontsReady }: { fontsReady: boolean }) {
  const { ready, session, profile, profileComplete, profileError, linkError, clearLinkError, recovery, refreshProfile, signOut } =
    useAuth();

  useEffect(() => {
    if (fontsReady && ready) void SplashScreen.hideAsync();
  }, [fontsReady, ready]);

  if (!fontsReady || !ready) return null;

  if (session && !profile) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StatusBar style="light" />
        <OfflineBanner />
        <Screen>
          <Text style={typography.h1}>Profile unavailable</Text>
          <InlineError message={profileError ?? 'Your profile could not be loaded.'} />
          <Button label="Try again" onPress={() => void refreshProfile()} />
          <Button label="Sign out" onPress={() => void signOut()} variant="ghost" />
        </Screen>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style="light" />
      <OfflineBanner />
      {linkError ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          onPress={clearLinkError}
          style={{ paddingHorizontal: layout.screenPadding, paddingVertical: spacing.sm }}
        >
          <InlineError message={linkError} />
        </Pressable>
      ) : null}
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Protected guard={!session}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected guard={!session || recovery}>
          <Stack.Screen name="reset-password" />
        </Stack.Protected>
        <Stack.Protected guard={Boolean(session) && !recovery && !profileComplete}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
        <Stack.Protected guard={Boolean(session) && !recovery && profileComplete}>
          <Stack.Screen name="(tabs)" />
        </Stack.Protected>
        <Stack.Screen name="+not-found" />
      </Stack>
    </View>
  );
}
