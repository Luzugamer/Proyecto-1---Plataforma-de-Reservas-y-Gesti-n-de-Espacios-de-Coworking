import { httpClient } from '@/shared/api/httpClient';
import { LedgerParams, MembershipPlan, PaginatedLedger } from './types';

export const membershipApi = {
  getPlans: (): Promise<MembershipPlan[]> => httpClient.get<MembershipPlan[]>('/plans'),

  getLedger: (params: LedgerParams = {}): Promise<PaginatedLedger> => {
    const search = new URLSearchParams();
    if (params.from) search.set('from', params.from);
    if (params.to) search.set('to', params.to);
    if (params.page) search.set('page', String(params.page));
    if (params.pageSize) search.set('pageSize', String(params.pageSize));
    const suffix = search.size ? `?${search.toString()}` : '';
    return httpClient.get<PaginatedLedger>(`/wallet/ledger${suffix}`);
  },
};
