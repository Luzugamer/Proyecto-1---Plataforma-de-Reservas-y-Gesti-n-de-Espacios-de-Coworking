import { useQuery } from '@tanstack/react-query';
import { membershipApi } from '../api';
import { WalletTransaction } from '../types';

export function useWalletTransactions() {
  return useQuery<WalletTransaction[]>({
    queryKey: ['wallet-transactions'],
    queryFn: () => membershipApi.getTransactions(),
  });
}
