import { Image } from 'expo-image';
import * as SystemUI from 'expo-system-ui';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View, type ScrollViewInstance, type TextStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { HighlightedTitle } from '@/components/HighlightedTitle';
import { Icon } from '@/components/ui/Icon';
import { colors, icon, layout, motion, radius, spacing, typography } from '@/constants/theme';
import { useIntro } from '@/lib/intro';
import { useThemeMode } from '@/lib/themeMode';

const readable: TextStyle = {
  textShadowColor: colors.paper,
  textShadowOffset: { width: 0, height: 0 },
  textShadowRadius: 8,
};

const slides = [
  {
    key: 'discover',
    source: require('../../assets/illustrations/onboarding-discover.jpg'),
    label: 'Vendor on a call beside a laptop',
    title: 'Everything You Need,\nRight Here',
    body: 'Discover, shop and support your campus vendors, from food and fashion to tech and more.',
  },
  {
    key: 'explore',
    source: require('../../assets/illustrations/onboarding-explore.jpg'),
    label: 'Student shopping on her phone',
    title: 'Find What\nYou Love',
    body: 'Browse shops and listings from people on your campus.',
  },
  {
    key: 'order',
    source: require('../../assets/illustrations/onboarding-order.jpg'),
    label: 'Phone showing a campus shop',
    title: 'Shop with Ease,\nStay Connected',
    body: 'Place an order and message the vendor. Pay in cash when you meet.',
  },
] as const;

function limeWave(width: number, height: number): string {
  const high = height * 0.08;
  const low = height * 0.22;
  return [
    `M 0 ${low}`,
    `C ${width * 0.16} ${high}, ${width * 0.3} ${low}, ${width * 0.46} ${height * 0.12}`,
    `C ${width * 0.64} ${high}, ${width * 0.8} ${low}, ${width} ${height * 0.1}`,
    `L ${width} ${height}`,
    `L 0 ${height}`,
    'Z',
  ].join(' ');
}

function SlideWash({ width, height }: { width: number; height: number }) {
  useThemeMode();
  const band = height * 0.46;
  return (
    <>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: -height * 0.05,
          left: -width * 0.14,
          width: width * 0.46,
          height: width * 0.46,
          borderRadius: radius.pill,
          backgroundColor: colors.primary,
          opacity: 0.42,
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: height * 0.03,
          right: -width * 0.14,
          width: width * 0.36,
          height: width * 0.36,
          borderRadius: radius.pill,
          backgroundColor: colors.lilac,
          opacity: 0.34,
        }}
      />
      <Svg
        pointerEvents="none"
        width={width}
        height={band}
        style={{ position: 'absolute', left: 0, bottom: 0, opacity: 0.72 }}
      >
        <Path d={limeWave(width, band)} fill={colors.primary} />
      </Svg>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: -width * 0.1,
          bottom: height * 0.34,
          width: width * 0.28,
          height: width * 0.28,
          borderRadius: radius.pill,
          backgroundColor: colors.violet,
          opacity: 0.16,
        }}
      />
    </>
  );
}

export default function WelcomeScreen() {
  useThemeMode();
  const { complete } = useIntro();
  const scrollRef = useRef<ScrollViewInstance>(null);
  const [index, setIndex] = useState(0);
  const [frame, setFrame] = useState({ width: 0, height: 0 });
  const last = index === slides.length - 1;

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(colors.primary);
    return () => {
      void SystemUI.setBackgroundColorAsync(colors.background);
    };
  }, []);

  const goTo = (next: number) => {
    if (frame.width <= 0) return;
    scrollRef.current?.scrollTo({ x: next * frame.width, animated: true });
    setIndex(next);
  };

  return (
    <View
      style={{ flex: 1, backgroundColor: colors.primary }}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setFrame((current) => (current.width === width && current.height === height ? current : { width, height }));
      }}
    >
      <StatusBar style="dark" />
      {frame.width > 0 ? (
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          horizontal
          pagingEnabled
          bounces={false}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(event) => {
            const next = Math.round(event.nativeEvent.contentOffset.x / frame.width);
            setIndex(Math.min(Math.max(next, 0), slides.length - 1));
          }}
        >
          {slides.map((slide) => (
            <View key={slide.key} style={{ width: frame.width, height: frame.height }}>
              <Image
                accessibilityLabel={slide.label}
                contentFit="cover"
                contentPosition="top"
                source={slide.source}
                style={{ position: 'absolute', top: 0, left: 0, width: frame.width, height: frame.height }}
              />
              <SlideWash height={frame.height} width={frame.width} />
              <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right', 'bottom']}>
                <View style={{ flex: 1 }} />
                <View
                  style={{
                    paddingHorizontal: layout.screenPadding,
                    gap: spacing.sm,
                    paddingBottom: layout.minTouchTarget + spacing.xl,
                  }}
                >
                  <HighlightedTitle color={colors.ink} style={readable} variant="hero">
                    {slide.title}
                  </HighlightedTitle>
                  <Text style={[typography.bodyMedium, readable, { color: colors.ink }]}>{slide.body}</Text>
                </View>
              </SafeAreaView>
            </View>
          ))}
        </ScrollView>
      ) : null}
      <SafeAreaView edges={['bottom', 'left', 'right']} style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }} pointerEvents="box-none">
        <View
          style={{
            marginHorizontal: layout.screenPadding,
            marginBottom: spacing.md,
            minHeight: layout.minTouchTarget,
            justifyContent: 'center',
          }}
        >
          <View style={{ position: 'absolute', left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: spacing.xs }}>
            {slides.map((slide, dot) => {
              const active = dot === index;
              return (
                <View
                  key={slide.key}
                  style={{
                    width: active ? spacing.lg : spacing.xs,
                    height: spacing.xs,
                    borderRadius: radius.pill,
                    backgroundColor: colors.violet,
                  }}
                />
              );
            })}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Skip"
              onPress={complete}
              style={{ minHeight: layout.minTouchTarget, justifyContent: 'center', paddingRight: spacing.md }}
            >
              <Text style={[typography.bodyMedium, readable, { color: colors.ink }]}>Skip</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={last ? 'Get Started' : 'Next'}
              onPress={() => {
                if (last) complete();
                else goTo(index + 1);
              }}
              style={({ pressed }) => ({
                minHeight: layout.minTouchTarget,
                paddingHorizontal: spacing.lg,
                borderRadius: radius.pill,
                backgroundColor: colors.violet,
                opacity: pressed ? motion.pressedOpacity : 1,
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.xs,
              })}
            >
              <Text style={[typography.button, { color: colors.paper }]}>
                {last ? 'Get Started' : 'Next'}
              </Text>
              <Icon name={last ? 'arrow-right' : 'chevron-right'} size={icon.sm} color="paper" />
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}
