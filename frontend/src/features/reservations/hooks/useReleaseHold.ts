import { useMutation, useQueryClient } from '@tanstack/react-query';
import { reservationsApi } from '../api';
import { AppApiError } from '@/shared/api/errorEnvelope';

export function useReleaseHold(resourceId?: string) {
  const queryClient = useQueryClient();

  return useMutation<void, AppApiError, string>({
    mutationFn: (holdId) => reservationsApi.releaseHold(holdId),
    onSuccess: () => {
      if (resourceId) {
        queryClient.invalidateQueries({ queryKey: ['availability', resourceId] });
      }
    },
  });
}
