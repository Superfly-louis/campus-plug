import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  closeBuyerRequest,
  createBuyerRequest,
  getBuyerRequest,
  listCampusRequests,
  listCampusShops,
  listMyRequests,
  listRequestOffers,
  offerOnRequest,
  removeBuyerRequest,
} from '@/lib/api/requests';
import { useAuth } from '@/lib/auth';

import { queryKeys } from '@/hooks/queries/keys';

export function useMyRequests() {
  const { session } = useAuth();
  const userId = session?.user.id ?? '';
  return useQuery({
    queryKey: queryKeys.requests.mine(userId),
    enabled: userId.length > 0,
    queryFn: listMyRequests,
  });
}

export function useCampusRequests(categoryId: string | null) {
  const { session } = useAuth();
  const userId = session?.user.id ?? '';
  return useQuery({
    queryKey: queryKeys.requests.campus(userId, categoryId),
    enabled: userId.length > 0,
    queryFn: () => listCampusRequests(categoryId),
  });
}

export function useCampusShops(enabled: boolean) {
  const { session } = useAuth();
  const userId = session?.user.id ?? '';
  return useQuery({
    queryKey: queryKeys.requests.shops(userId),
    enabled: enabled && userId.length > 0,
    queryFn: listCampusShops,
  });
}

export function useBuyerRequest(requestId: string) {
  return useQuery({
    queryKey: queryKeys.requests.detail(requestId),
    enabled: requestId.length > 0,
    queryFn: () => getBuyerRequest(requestId),
  });
}

export function useRequestOffers(requestId: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.requests.offers(requestId),
    enabled: enabled && requestId.length > 0,
    queryFn: () => listRequestOffers(requestId),
  });
}

export function useCreateBuyerRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createBuyerRequest,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.requests.all });
    },
  });
}

export function useCloseBuyerRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: closeBuyerRequest,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.requests.all });
    },
  });
}

export function useOfferOnRequest(requestId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (note: string) => offerOnRequest(requestId, note),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.requests.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all });
    },
  });
}

export function useRemoveBuyerRequest(requestId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reason: string) => removeBuyerRequest(requestId, reason),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.requests.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.admin.all });
    },
  });
}
