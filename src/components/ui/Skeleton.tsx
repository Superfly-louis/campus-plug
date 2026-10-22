import { useEffect, useState } from 'react';
import { Animated, type DimensionValue, type ViewStyle } from 'react-native';

import { colors, motion, radius, spacing } from '@/constants/theme';

type SkeletonProps = {
  width?: DimensionValue;
  height?: number;
  rounded?: keyof typeof radius;
  style?: ViewStyle;
};

export function Skeleton({
  width = '100%',
  height = spacing.lg,
  rounded = 'md',
  style,
}: SkeletonProps) {
  const [opacity] = useState(() => new Animated.Value(1));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: motion.skeletonMinOpacity,
          duration: motion.skeletonDurationMs,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: motion.skeletonDurationMs,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      accessibilityElementsHidden
      style={[
        {
          width,
          height,
          borderRadius: radius[rounded],
          backgroundColor: colors.surfaceAlt,
          opacity,
        },
        style,
      ]}
    />
  );
}
