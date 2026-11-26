import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createPayment, getLatestPayment, getPaymentTerms, verifyPayment } from '@/lib/api/payments';

import { queryKeys } from '@/hooks/queries/keys';

export function useLatestPayment(orderId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.payments.latest(orderId),
    enabled: enabled && orderId.length > 0,
    queryFn: () => getLatestPayment(orderId),
  });
}

export function usePaymentTerms(enabled = true) {
  return useQuery({
    queryKey: queryKeys.payments.terms,
    enabled,
    queryFn: getPaymentTerms,
  });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) => createPayment(orderId),
    onSuccess: async (_checkout, orderId) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.payments.latest(orderId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.charges.all });
    },
  });
}

export function useVerifyPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) => verifyPayment(orderId),
    onSuccess: async (_check, orderId) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.payments.latest(orderId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.charges.all });
    },
  });
}
