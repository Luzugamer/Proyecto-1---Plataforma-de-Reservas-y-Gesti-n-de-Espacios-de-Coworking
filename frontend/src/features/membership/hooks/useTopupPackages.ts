import { useQuery } from '@tanstack/react-query';
import { membershipApi } from '../api';
import { TopupPackage } from '../types';

export function useTopupPackages() {
  return useQuery<TopupPackage[]>({
    queryKey: ['topup-packages'],
    queryFn: () => membershipApi.getTopupPackages(),
    staleTime: 5 * 60 * 1000,
  });
}
