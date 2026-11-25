import { useState } from 'react';
import { Text, View } from 'react-native';

import { StarRating } from '@/components/orders/StarRating';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { InlineError } from '@/components/ui/InlineError';
import { TextField } from '@/components/ui/TextField';
import { limits, spacing, typography } from '@/constants/theme';
import { useOrderReview, useSubmitOrderReview } from '@/hooks/queries/useReviews';
import { toFriendlyError } from '@/lib/errors';
import { useThemeMode } from '@/lib/themeMode';

export function OrderReviewCard({ orderId }: { orderId: string }) {
  useThemeMode();
  const existing = useOrderReview(orderId, true);
  const submit = useSubmitOrderReview(orderId);
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const review = existing.data;

  async function send() {
    setError(null);
    if (rating < 1) {
      setError('Choose a rating from 1 to 5.');
      return;
    }
    try {
      await submit.mutateAsync({ rating, body });
    } catch (caught) {
      setError(toFriendlyError(caught));
    }
  }

  return (
    <Card>
      <Text style={typography.h2}>{review ? 'Your review' : 'Review this shop'}</Text>
      {existing.isPending ? <Text style={typography.bodySmall}>Loading your review.</Text> : null}
      {review ? (
        <View style={{ gap: spacing.xs }}>
          <StarRating value={review.rating} />
          {review.body ? <Text style={typography.body}>{review.body}</Text> : null}
        </View>
      ) : existing.isPending ? null : (
        <View style={{ gap: spacing.sm }}>
          <Text style={typography.bodySmall}>How was this order? One review for each completed order.</Text>
          <StarRating onChange={setRating} value={rating} />
          <TextField
            label="Comment"
            multiline
            onChangeText={setBody}
            placeholder="Optional"
            value={body}
          />
          <Text style={typography.caption}>{`${body.trim().length}/${limits.reviewBodyMax}`}</Text>
          {error ? <InlineError message={error} /> : null}
          <Button label="Send review" loading={submit.isPending} onPress={() => void send()} />
        </View>
      )}
    </Card>
  );
}
