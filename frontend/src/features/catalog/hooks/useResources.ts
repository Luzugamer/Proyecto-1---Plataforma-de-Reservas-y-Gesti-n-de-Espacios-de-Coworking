import { useQuery } from '@tanstack/react-query';
import { catalogApi } from '../api';
import { Resource, ResourceType } from '../types';
import { AppApiError } from '@/shared/api/errorEnvelope';

export function useResources(siteId: string | null, type?: ResourceType) {
  return useQuery<Resource[], AppApiError>({
    queryKey: ['resources', siteId, type],
    queryFn: () => {
      if (!siteId) return Promise.resolve([]);
      return catalogApi.getResources(siteId, type);
    },
    enabled: !!siteId,
    staleTime: 2 * 60 * 1000,
  });
}
