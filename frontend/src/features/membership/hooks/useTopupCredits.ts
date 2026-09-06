import { useMutation, useQueryClient } from '@tanstack/react-query';
import { membershipApi } from '../api';
import { TopupRequest, TopupResponse } from '../types';

export function useTopupCredits() {
  const queryClient = useQueryClient();

  return useMutation<TopupResponse, Error, TopupRequest>({
    mutationFn: (data) => membershipApi.purchaseTopup(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet-balance'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-transactions'] });
    },
  });
}
