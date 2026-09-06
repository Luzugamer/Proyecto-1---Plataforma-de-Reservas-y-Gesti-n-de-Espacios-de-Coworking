import { useMutation, useQueryClient } from '@tanstack/react-query';
import { lifecycleApi } from '../api';
import { CancelReservationResponse } from '../types';
import { AppApiError } from '@/shared/api/errorEnvelope';

export function useCancelReservation() {
  const queryClient = useQueryClient();

  return useMutation<CancelReservationResponse, AppApiError, string>({
    mutationFn: (reservationId) => lifecycleApi.cancelReservation(reservationId),
    onSuccess: () => {
      // Sincronizar reservas y balance de créditos reembolsados
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['walletBalance'] });
      queryClient.invalidateQueries({ queryKey: ['availability'] });
    },
  });
}
