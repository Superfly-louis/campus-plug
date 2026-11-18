import { LinearGradient } from 'expo-linear-gradient';
import { useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView, type Edges } from 'react-native-safe-area-context';

import { RefreshSpinner } from '@/components/ui/RefreshSpinner';
import { useTabBarInset } from '@/components/ui/TabBar';
import { TabSwipeContext, useMainTabSwipe } from '@/components/ui/tabSwipe';
import { colors, gradients, gradientAxis, layout, spacing } from '@/constants/theme';

type ScreenProps = {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  edges?: Edges;
  refreshing?: boolean;
  onRefresh?: () => void;
  paper?: boolean;
};

export function Screen({
  children,
  scroll = false,
  padded = true,
  edges,
  refreshing = false,
  onRefresh,
  paper = false,
}: ScreenProps) {
  const segments: readonly string[] = useSegments();
  const inTabs = segments.includes('(main)');
  const safeEdges: Edges = edges ?? (inTabs ? ['top', 'left', 'right'] : ['top', 'left', 'right', 'bottom']);
  const tabInset = useTabBarInset();
  const swipe = useMainTabSwipe();

  useEffect(() => {
    if (!paper) return;
    void SystemUI.setBackgroundColorAsync(colors.paper);
    return () => {
      void SystemUI.setBackgroundColorAsync(colors.background);
    };
  }, [paper]);

  const body = (
    <View
      style={{
        flexGrow: 1,
        flex: scroll ? undefined : 1,
        padding: padded ? layout.screenPadding : 0,
        gap: spacing.lg,
      }}
    >
      {children}
    </View>
  );

  const frame = (
    <SafeAreaView style={{ flex: 1, backgroundColor: paper ? colors.paper : 'transparent' }} edges={safeEdges}>
      {paper ? <StatusBar style="dark" /> : null}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          {scroll ? (
            <ScrollView
              contentInsetAdjustmentBehavior={inTabs ? 'automatic' : 'never'}
              contentContainerStyle={{ flexGrow: 1, paddingBottom: tabInset }}
              keyboardShouldPersistTaps="handled"
              refreshControl={
                onRefresh ? <RefreshSpinner onRefresh={onRefresh} refreshing={refreshing} /> : undefined
              }
            >
              {body}
            </ScrollView>
          ) : (
            body
          )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  const surface = paper ? (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>{frame}</View>
  ) : (
    <LinearGradient colors={gradients.screen} start={gradientAxis.start} end={gradientAxis.end} style={{ flex: 1 }}>
      {frame}
    </LinearGradient>
  );

  if (!swipe) return surface;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <TabSwipeContext.Provider value={swipe}>
        <GestureDetector gesture={swipe}>{surface}</GestureDetector>
      </TabSwipeContext.Provider>
    </GestureHandlerRootView>
  );
}
