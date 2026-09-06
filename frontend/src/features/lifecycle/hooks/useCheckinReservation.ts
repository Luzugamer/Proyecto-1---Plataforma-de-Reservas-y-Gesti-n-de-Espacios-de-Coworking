import { useMutation, useQueryClient } from '@tanstack/react-query';
import { lifecycleApi } from '../api';
import { CheckinReservationResponse } from '../types';
import { AppApiError } from '@/shared/api/errorEnvelope';

export function useCheckinReservation() {
  const queryClient = useQueryClient();

  return useMutation<CheckinReservationResponse, AppApiError, string>({
    mutationFn: (reservationId) => lifecycleApi.checkinReservation(reservationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
    },
  });
}
