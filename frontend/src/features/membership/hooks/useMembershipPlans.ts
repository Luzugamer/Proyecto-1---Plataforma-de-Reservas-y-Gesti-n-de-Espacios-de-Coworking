import { useQuery } from '@tanstack/react-query';
import { membershipApi } from '../api';
import { MembershipPlan } from '../types';

export function useMembershipPlans() {
  return useQuery<MembershipPlan[]>({
    queryKey: ['membership-plans'],
    queryFn: () => membershipApi.getPlans(),
    staleTime: 5 * 60 * 1000,
  });
}
