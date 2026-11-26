import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { connectPayoutAccount, getPayoutStatus, listPayoutBanks, resolvePayoutAccount } from '@/lib/api/payout';

import { queryKeys } from '@/hooks/queries/keys';

export function usePayoutStatus() {
  return useQuery({
    queryKey: queryKeys.payout.status,
    queryFn: getPayoutStatus,
  });
}

export function usePayoutBanks(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.payout.banks,
    enabled,
    queryFn: listPayoutBanks,
  });
}

export function useResolvePayoutAccount() {
  return useMutation({
    mutationFn: (input: { bankCode: string; accountNumber: string }) =>
      resolvePayoutAccount(input.bankCode, input.accountNumber),
  });
}

export function useConnectPayoutAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { bankCode: string; accountNumber: string; accountName: string }) =>
      connectPayoutAccount(input.bankCode, input.accountNumber, input.accountName),
    onSuccess: async (status) => {
      queryClient.setQueryData(queryKeys.payout.status, status);
      await queryClient.invalidateQueries({ queryKey: queryKeys.payout.status });
    },
  });
}
