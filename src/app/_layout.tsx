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
import { entryPath } from '@/lib/entry';
import { IntroProvider, useIntro } from '@/lib/intro';
import { PresenceProvider } from '@/lib/presence';
import { ThemeModeProvider, useThemeMode } from '@/lib/themeMode';
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
      <PresenceProvider>
        <RootNavigator fontsReady={fontsReady} />
      </PresenceProvider>
    </AuthProvider>
  ) : (
    <SetupRequired fontsReady={fontsReady} />
  );

  return (
    <ErrorBoundary>
      <ThemeModeProvider>
        <QueryClientProvider client={queryClient}>
          <IntroProvider>{app}</IntroProvider>
        </QueryClientProvider>
      </ThemeModeProvider>
    </ErrorBoundary>
  );
}

function ThemeStatus() {
  const { mode } = useThemeMode();
  return <StatusBar style={mode === 'light' ? 'dark' : 'light'} />;
}

function SetupRequired({ fontsReady }: { fontsReady: boolean }) {
  useThemeMode();
  useEffect(() => {
    if (fontsReady) void SplashScreen.hideAsync();
  }, [fontsReady]);

  if (!fontsReady) return null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ThemeStatus />
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
  useThemeMode();
  const { ready, session, profile, profileComplete, profileError, linkError, clearLinkError, recovery, refreshProfile, signOut } =
    useAuth();
  const intro = useIntro();

  useEffect(() => {
    if (fontsReady && ready && intro.seen !== null) void SplashScreen.hideAsync();
  }, [fontsReady, ready, intro.seen]);

  if (!fontsReady || !ready || intro.seen === null) return null;

  const entry = entryPath({
    signedIn: Boolean(session),
    recovery,
    profileComplete,
    introSeen: intro.seen === true,
  });

  if (session && !profile) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ThemeStatus />
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
      <ThemeStatus />
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
        <Stack.Protected guard={!recovery && intro.seen === false} redirectTo={entry}>
          <Stack.Screen name="welcome" />
        </Stack.Protected>
        <Stack.Protected guard={!session && !recovery && intro.seen === true} redirectTo={entry}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected guard={!session || recovery} redirectTo={entry}>
          <Stack.Screen name="reset-password" />
        </Stack.Protected>
        <Stack.Protected guard={Boolean(session) && !recovery && intro.seen === true && !profileComplete} redirectTo={entry}>
          <Stack.Screen name="onboarding" options={{ contentStyle: { backgroundColor: colors.paper } }} />
        </Stack.Protected>
        <Stack.Protected guard={Boolean(session) && !recovery && intro.seen === true && profileComplete} redirectTo={entry}>
          <Stack.Screen name="(tabs)" />
        </Stack.Protected>
        <Stack.Screen name="+not-found" />
      </Stack>
    </View>
  );
}
