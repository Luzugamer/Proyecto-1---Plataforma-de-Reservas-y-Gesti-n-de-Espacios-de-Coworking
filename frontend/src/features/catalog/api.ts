import { httpClient } from '@/shared/api/httpClient';
import {
  Site,
  Resource,
  ResourceType,
  ResourceAvailability,
  BlockResourceRequest,
  BlockResourceResponse,
} from './types';

export const catalogApi = {
  getSites: (): Promise<Site[]> =>
    httpClient.get<Site[]>('/sites', { skipAuth: true }),

  getResources: (siteId: string, type?: ResourceType): Promise<Resource[]> => {
    const query = type ? `?type=${type}` : '';
    return httpClient.get<Resource[]>(`/sites/${siteId}/resources${query}`, { skipAuth: true });
  },

  getResource: (resourceId: string): Promise<Resource & { site: Site }> =>
    httpClient.get<Resource & { site: Site }>(`/resources/${resourceId}`, { skipAuth: true }),

  getAvailability: (resourceId: string, date: string): Promise<ResourceAvailability> =>
    httpClient.get<ResourceAvailability>(`/resources/${resourceId}/availability?date=${date}`, {
      skipAuth: true,
    }),

  blockResource: (
    resourceId: string,
    payload: BlockResourceRequest
  ): Promise<BlockResourceResponse> =>
    httpClient.post<BlockResourceResponse>(`/admin/resources/${resourceId}/blocks`, payload),
};
