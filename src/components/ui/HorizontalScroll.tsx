import type { Ref } from 'react';
import { ScrollView, type ScrollViewInstance, type ScrollViewProps } from 'react-native';
import { GestureDetector, useNativeGesture } from 'react-native-gesture-handler';

import { useTabSwipe } from '@/components/ui/tabSwipe';

type HorizontalScrollProps = ScrollViewProps & {
  ref?: Ref<ScrollViewInstance>;
};

export function HorizontalScroll({ ref, ...props }: HorizontalScrollProps) {
  const swipe = useTabSwipe();
  const native = useNativeGesture(swipe ? { block: swipe } : undefined);

  const scroll = (
    <ScrollView
      nestedScrollEnabled
      removeClippedSubviews={false}
      showsHorizontalScrollIndicator={false}
      {...props}
      ref={ref}
      horizontal
      style={[{ flexGrow: 0 }, props.style]}
    />
  );

  if (!swipe) return scroll;

  return <GestureDetector gesture={native}>{scroll}</GestureDetector>;
}
