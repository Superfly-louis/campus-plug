import { LinearGradient } from 'expo-linear-gradient';
import { useSegments } from 'expo-router';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView, type Edges } from 'react-native-safe-area-context';

import { useTabBarInset } from '@/components/ui/TabBar';
import { colors, gradients, gradientAxis, layout, spacing } from '@/constants/theme';

type ScreenProps = {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  edges?: Edges;
  refreshing?: boolean;
  onRefresh?: () => void;
};

export function Screen({
  children,
  scroll = false,
  padded = true,
  edges,
  refreshing = false,
  onRefresh,
}: ScreenProps) {
  const segments: readonly string[] = useSegments();
  const inTabs = segments.includes('(main)');
  const safeEdges: Edges = edges ?? (inTabs ? ['top', 'left', 'right'] : ['top', 'left', 'right', 'bottom']);
  const tabInset = useTabBarInset();
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

  return (
    <LinearGradient colors={gradients.screen} start={gradientAxis.start} end={gradientAxis.end} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }} edges={safeEdges}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          {scroll ? (
            <ScrollView
              contentInsetAdjustmentBehavior={inTabs ? 'automatic' : 'never'}
              contentContainerStyle={{ flexGrow: 1, paddingBottom: tabInset }}
              keyboardShouldPersistTaps="handled"
              refreshControl={
                onRefresh ? (
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor={colors.primary}
                    colors={[colors.primary]}
                    progressBackgroundColor={colors.surface}
                  />
                ) : undefined
              }
            >
              {body}
            </ScrollView>
          ) : (
            body
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}
