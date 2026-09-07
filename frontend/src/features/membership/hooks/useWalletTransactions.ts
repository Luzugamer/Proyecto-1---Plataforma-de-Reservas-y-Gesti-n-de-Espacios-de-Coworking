import { useQuery } from '@tanstack/react-query';
import { membershipApi } from '../api';
import { PaginatedLedger } from '../types';

export function useWalletTransactions(page = 1) {
  return useQuery<PaginatedLedger>({
    queryKey: ['wallet-transactions', page],
    queryFn: () => membershipApi.getLedger({ page, pageSize: 20 }),
  });
}
