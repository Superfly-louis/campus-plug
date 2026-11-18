import { Image } from 'expo-image';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { colors, marketplace, radius, spacing } from '@/constants/theme';

type ImageCarouselProps = {
  images: readonly string[];
  accessibilityLabel?: string;
};

export function ImageCarousel({ images, accessibilityLabel = 'Product photos' }: ImageCarouselProps) {
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const frames = images.length > 0 ? images : [''];

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      onLayout={(event) => {
        const next = event.nativeEvent.layout.width;
        setWidth((current) => (current === next ? current : next));
      }}
    >
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => {
          if (width <= 0) return;
          const next = Math.round(event.nativeEvent.contentOffset.x / width);
          setIndex((current) => (current === next ? current : next));
        }}
      >
        {frames.map((uri, frame) => (
          <View
            key={`${uri}-${frame}`}
            style={{
              width,
              height: marketplace.carouselHeight,
              borderBottomLeftRadius: radius.xl,
              borderBottomRightRadius: radius.xl,
              overflow: 'hidden',
              backgroundColor: colors.surfaceAlt,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {uri ? (
              <Image source={{ uri }} contentFit="cover" style={{ width: '100%', height: '100%' }} />
            ) : (
              <Icon name="package" color="lilac" />
            )}
          </View>
        ))}
      </ScrollView>
      {images.length > 1 ? (
        <View
          style={{
            position: 'absolute',
            bottom: spacing.md,
            left: 0,
            right: 0,
            flexDirection: 'row',
            justifyContent: 'center',
            gap: spacing.xs,
          }}
        >
          {images.map((uri, dot) => (
            <View
              key={`${uri}-${dot}`}
              style={{
                width: dot === index ? spacing.xl : spacing.xs,
                height: spacing.xs,
                borderRadius: radius.pill,
                backgroundColor: colors.primary,
              }}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}
