import { useMutation, useQueryClient } from '@tanstack/react-query';
import { catalogApi } from '../api';
import { BlockResourceRequest, BlockResourceResponse } from '../types';
import { AppApiError } from '@/shared/api/errorEnvelope';

export function useBlockResource(resourceId: string) {
  const queryClient = useQueryClient();

  return useMutation<BlockResourceResponse, AppApiError, BlockResourceRequest>({
    mutationFn: (payload) => catalogApi.blockResource(resourceId, payload),
    onSuccess: () => {
      // Invalidar queries de disponibilidad del recurso
      queryClient.invalidateQueries({ queryKey: ['availability', resourceId] });
    },
  });
}
