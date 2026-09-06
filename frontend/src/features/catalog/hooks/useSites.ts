import { useQuery } from '@tanstack/react-query';
import { catalogApi } from '../api';
import { Site } from '../types';
import { AppApiError } from '@/shared/api/errorEnvelope';

export function useSites() {
  return useQuery<Site[], AppApiError>({
    queryKey: ['sites'],
    queryFn: () => catalogApi.getSites(),
    staleTime: 5 * 60 * 1000, // 5 minutos de cache
  });
}
