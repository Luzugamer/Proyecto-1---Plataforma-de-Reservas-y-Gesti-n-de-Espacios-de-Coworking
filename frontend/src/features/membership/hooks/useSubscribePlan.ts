import { useMutation, useQueryClient } from '@tanstack/react-query';
import { membershipApi } from '../api';
import { SubscribePlanRequest, SubscribePlanResponse } from '../types';

export function useSubscribePlan() {
  const queryClient = useQueryClient();

  return useMutation<SubscribePlanResponse, Error, SubscribePlanRequest>({
    mutationFn: (data) => membershipApi.subscribeToPlan(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-subscription'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-balance'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-transactions'] });
    },
  });
}
