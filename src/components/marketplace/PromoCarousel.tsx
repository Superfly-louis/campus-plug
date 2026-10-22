import { useEffect, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { PromoBanner } from '@/components/marketplace/PromoBanner';
import { promos, type PromoAction } from '@/constants/promos';
import { colors, marketplace, motion, radius, spacing } from '@/constants/theme';

type PromoCarouselProps = {
  onExploreCategory: (slug: string) => void;
  onStartSelling: () => void;
};

export function PromoCarousel({ onExploreCategory, onStartSelling }: PromoCarouselProps) {
  const scrollRef = useRef<ScrollView>(null);
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
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
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
      </ScrollView>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.xs, marginTop: spacing.sm }}>
        {promos.map((promo, dot) => (
          <View
            key={promo.id}
            accessibilityLabel={dot === index ? `Slide ${dot + 1}, current` : `Slide ${dot + 1}`}
            style={{
              width: dot === index ? spacing.xl : spacing.xs,
              height: spacing.xs,
              borderRadius: radius.pill,
              backgroundColor: dot === index ? colors.primary : colors.indigo,
            }}
          />
        ))}
      </View>
    </View>
  );
}
