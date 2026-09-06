import { useMutation, useQueryClient } from '@tanstack/react-query';
import { reservationsApi } from '../api';
import { CreateHoldRequest, HoldResponse } from '../types';
import { AppApiError } from '@/shared/api/errorEnvelope';

export function useCreateHold() {
  const queryClient = useQueryClient();

  return useMutation<HoldResponse, AppApiError, CreateHoldRequest>({
    mutationFn: (payload) => reservationsApi.createHold(payload),
    onSuccess: (data) => {
      // Invalidar availability para que el slot aparezca como HELD
      queryClient.invalidateQueries({ queryKey: ['availability', data.resourceId] });
    },
  });
}
