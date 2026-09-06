import { useQuery } from '@tanstack/react-query';
import { catalogApi } from '../api';
import { ResourceAvailability } from '../types';
import { AppApiError } from '@/shared/api/errorEnvelope';

export function useAvailability(resourceId: string | undefined, date: string, enablePolling = true) {
  return useQuery<ResourceAvailability, AppApiError>({
    queryKey: ['availability', resourceId, date],
    queryFn: () => {
      if (!resourceId) throw new Error('Resource ID requerido');
      return catalogApi.getAvailability(resourceId, date);
    },
    enabled: !!resourceId && !!date,
    refetchInterval: enablePolling ? 30000 : false, // Polling de 30 segundos (EARS / especificación)
    refetchIntervalInBackground: false,
    staleTime: 10000,
  });
}
