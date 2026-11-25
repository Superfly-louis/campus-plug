import { useEffect, useRef, useState } from 'react';
import { type ScrollViewInstance, View } from 'react-native';

import { PromoBanner } from '@/components/marketplace/PromoBanner';
import { HorizontalScroll } from '@/components/ui/HorizontalScroll';
import { promos, type PromoAction } from '@/constants/promos';
import { marketplace, motion, colors, radius, spacing } from '@/constants/theme';
import { useThemeMode } from '@/lib/themeMode';

type PromoCarouselProps = {
  onExploreCategory: (slug: string) => void;
  onStartSelling: () => void;
};

export function PromoCarousel({ onExploreCategory, onStartSelling }: PromoCarouselProps) {
  useThemeMode();
  const scrollRef = useRef<ScrollViewInstance>(null);
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const skipScroll = useRef(true);

  useEffect(() => {
    if (width <= 0) return;
    if (skipScroll.current) {
      skipScroll.current = false;
      return;
    }
    scrollRef.current?.scrollTo({ x: index * width, animated: true });
  }, [index, width]);

  useEffect(() => {
    if (width <= 0 || promos.length < 2) return;
    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % promos.length);
    }, motion.secondMs * marketplace.promoAdvanceSec);
    return () => clearInterval(timer);
  }, [width, index]);

  function run(action: PromoAction) {
    if (action.type === 'explore-category') onExploreCategory(action.slug);
    else onStartSelling();
  }

  return (
    <View
      accessibilityLabel="Promotions"
      onLayout={(event) => {
        const next = event.nativeEvent.layout.width;
        setWidth((current) => (current === next ? current : next));
      }}
    >
      <HorizontalScroll
        ref={scrollRef}
        pagingEnabled
        onMomentumScrollEnd={(event) => {
          if (width <= 0) return;
          const next = Math.round(event.nativeEvent.contentOffset.x / width);
          setIndex((current) => (current === next ? current : next));
        }}
      >
        {promos.map((promo) => (
          <View key={promo.id} style={{ width }}>
            <PromoBanner promo={promo} onPress={() => run(promo.action)} />
          </View>
        ))}
      </HorizontalScroll>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.xs, marginTop: spacing.sm }}>
        {promos.map((promo, dot) => (
          <View
            key={promo.id}
            accessibilityLabel={dot === index ? `Slide ${dot + 1}, current` : `Slide ${dot + 1}`}
            style={{
              width: dot === index ? spacing.lg : 6,
              height: 6,
              borderRadius: radius.pill,
              backgroundColor: colors.primary,
            }}
          />
        ))}
      </View>
    </View>
  );
}
