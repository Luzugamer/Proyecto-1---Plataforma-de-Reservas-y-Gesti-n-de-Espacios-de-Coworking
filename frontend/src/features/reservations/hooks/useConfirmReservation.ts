import { useMutation, useQueryClient } from '@tanstack/react-query';
import { reservationsApi } from '../api';
import { CreateReservationRequest, ReservationResponse } from '../types';
import { AppApiError } from '@/shared/api/errorEnvelope';

export function useConfirmReservation(resourceId?: string) {
  const queryClient = useQueryClient();

  return useMutation<ReservationResponse, AppApiError, CreateReservationRequest>({
    mutationFn: (payload) => reservationsApi.confirmReservation(payload),
    onSuccess: () => {
      // Sincronizar saldo de billetera y grilla de disponibilidad
      queryClient.invalidateQueries({ queryKey: ['walletBalance'] });
      if (resourceId) {
        queryClient.invalidateQueries({ queryKey: ['availability', resourceId] });
      }
    },
  });
}
