import { useQuery } from '@tanstack/react-query';
import { membershipApi } from '../api';
import { UserSubscription } from '../types';

export function useCurrentSubscription() {
  return useQuery<UserSubscription>({
    queryKey: ['current-subscription'],
    queryFn: () => membershipApi.getCurrentSubscription(),
  });
}
