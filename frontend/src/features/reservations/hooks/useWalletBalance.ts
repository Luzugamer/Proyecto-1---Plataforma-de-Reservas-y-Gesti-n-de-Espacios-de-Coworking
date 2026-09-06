import { useQuery } from '@tanstack/react-query';
import { reservationsApi } from '../api';
import { WalletBalance } from '../types';
import { AppApiError } from '@/shared/api/errorEnvelope';
import { useAuth } from '@/features/auth/hooks/useAuth';

export function useWalletBalance() {
  const { isAuthenticated } = useAuth();

  return useQuery<WalletBalance, AppApiError>({
    queryKey: ['walletBalance'],
    queryFn: () => reservationsApi.getWalletBalance(),
    enabled: isAuthenticated,
    staleTime: 30000,
  });
}
