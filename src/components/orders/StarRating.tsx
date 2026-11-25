import { Pressable, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { icon, spacing } from '@/constants/theme';

const stars = [1, 2, 3, 4, 5] as const;

type StarRatingProps = {
  value: number;
  onChange?: (value: number) => void;
};

export function StarRating({ value, onChange }: StarRatingProps) {
  return (
    <View accessibilityLabel={`${value} of 5 stars`} style={{ flexDirection: 'row', gap: spacing.xxs }}>
      {stars.map((star) => {
        const selected = star <= value;
        const mark = (
          <Icon color={selected ? 'warning' : 'textMuted'} filled={selected} name="star" size={icon.md} />
        );
        if (!onChange) return <View key={star}>{mark}</View>;
        return (
          <Pressable
            accessibilityLabel={`Rate ${star} ${star === 1 ? 'star' : 'stars'}`}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            hitSlop={spacing.xs}
            key={star}
            onPress={() => onChange(star)}
            style={{ minWidth: spacing.xxl, minHeight: spacing.xxl, alignItems: 'center', justifyContent: 'center' }}
          >
            {mark}
          </Pressable>
        );
      })}
    </View>
  );
}
