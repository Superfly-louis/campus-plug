import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  getOrderReview,
  listShopReviews,
  shopReviewSummaries,
  submitOrderReview,
} from '@/lib/api/reviews';

import { queryKeys } from '@/hooks/queries/keys';

export function useShopReviewSummaries() {
  return useQuery({
    queryKey: queryKeys.reviews.summaries,
    queryFn: shopReviewSummaries,
  });
}

export function useShopReviews(vendorId: string) {
  return useQuery({
    queryKey: queryKeys.reviews.shop(vendorId),
    enabled: vendorId.length > 0,
    queryFn: () => listShopReviews(vendorId),
  });
}

export function useOrderReview(orderId: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.reviews.order(orderId),
    enabled: enabled && orderId.length > 0,
    queryFn: () => getOrderReview(orderId),
  });
}

export function useSubmitOrderReview(orderId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { rating: number; body: string }) => submitOrderReview(orderId, input.rating, input.body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.reviews.all });
    },
  });
}
