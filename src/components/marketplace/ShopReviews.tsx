import { Text, View } from 'react-native';

import { OptionalMeta } from '@/components/marketplace/OptionalMeta';
import { StarRating } from '@/components/orders/StarRating';
import { Card } from '@/components/ui/Card';
import { spacing, typography } from '@/constants/theme';
import { useShopReviewSummaries, useShopReviews } from '@/hooks/queries/useReviews';
import { useThemeMode } from '@/lib/themeMode';

function reviewDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function ShopReviews({ vendorId }: { vendorId: string }) {
  useThemeMode();
  const reviews = useShopReviews(vendorId);
  const summaries = useShopReviewSummaries();
  const rows = reviews.data ?? [];
  const summary = summaries.data?.[vendorId];
  const rating = summary && summary.reviewCount > 0 ? summary.rating : null;
  const reviewCount = summary && summary.reviewCount > 0 ? summary.reviewCount : null;

  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={typography.eyebrow}>Reviews</Text>
      {reviews.isPending ? <Text style={typography.bodySmall}>Loading reviews.</Text> : null}
      {!reviews.isPending && rows.length === 0 ? <Text style={typography.bodySmall}>No reviews yet.</Text> : null}
      {rating != null && reviewCount != null ? <OptionalMeta rating={rating} reviewCount={reviewCount} /> : null}
      {rows.map((review) => (
        <Card key={review.id}>
          <View style={{ gap: spacing.xs }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
              <Text numberOfLines={1} style={[typography.bodyMedium, { flex: 1 }]}>
                {review.buyerName}
              </Text>
              <Text style={typography.caption}>{reviewDate(review.createdAt)}</Text>
            </View>
            <StarRating value={review.rating} />
            {review.body ? <Text style={typography.body}>{review.body}</Text> : null}
          </View>
        </Card>
      ))}
    </View>
  );
}
