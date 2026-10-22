import { Pressable, Text, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { detailFractionDigits, icon, spacing, typography } from '@/constants/theme';

export type OptionalMetaProps = {
  rating?: number;
  reviewCount?: number;
  distanceKm?: number;
  wished?: boolean;
  onToggleWishlist?: () => void;
};

export function OptionalMeta({
  rating,
  reviewCount,
  distanceKm,
  wished = false,
  onToggleWishlist,
}: OptionalMetaProps) {
  if (rating == null && reviewCount == null && distanceKm == null && !onToggleWishlist) return null;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }}>
      {rating != null ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xxs }}>
          <Icon name="star" size={icon.sm} color="warning" />
          <Text style={typography.caption}>{rating.toFixed(detailFractionDigits)}</Text>
        </View>
      ) : null}
      {reviewCount != null ? (
        <Text style={typography.caption}>{reviewCount === 1 ? '1 review' : `${reviewCount} reviews`}</Text>
      ) : null}
      {distanceKm != null ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xxs }}>
          <Icon name="map-pin" size={icon.sm} color="lilac" />
          <Text style={typography.caption}>{distanceKm.toFixed(detailFractionDigits)} km</Text>
        </View>
      ) : null}
      {onToggleWishlist ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={wished ? 'Remove from wishlist' : 'Save to wishlist'}
          onPress={onToggleWishlist}
          hitSlop={spacing.xs}
        >
          <Icon name="heart" size={icon.sm} color={wished ? 'primary' : 'textMuted'} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function productCountLabel(count: number): string {
  return count === 1 ? '1 product' : `${count} products`;
}
