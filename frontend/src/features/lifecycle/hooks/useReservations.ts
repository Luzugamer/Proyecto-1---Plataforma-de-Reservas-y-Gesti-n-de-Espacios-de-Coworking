import { useQuery } from '@tanstack/react-query';
import { lifecycleApi } from '../api';
import { PaginatedReservations, GetReservationsParams } from '../types';
import { AppApiError } from '@/shared/api/errorEnvelope';
import { useAuth } from '@/features/auth/hooks/useAuth';

export function useReservations(params?: GetReservationsParams) {
  const { isAuthenticated } = useAuth();

  return useQuery<PaginatedReservations, AppApiError>({
    queryKey: ['reservations', params?.status, params?.page, params?.pageSize],
    queryFn: () => lifecycleApi.getReservations(params),
    enabled: isAuthenticated,
    refetchInterval: 30000, // Polling de 30 segundos (EARS / especificación)
    refetchIntervalInBackground: false,
    staleTime: 10000,
  });
}
