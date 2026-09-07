import { useMutation, useQueryClient } from '@tanstack/react-query';
import { lifecycleApi } from '../api';
import { CheckinReservationResponse, PaginatedReservations } from '../types';
import { AppApiError } from '@/shared/api/errorEnvelope';

export function useCheckinReservation() {
  const queryClient = useQueryClient();

  return useMutation<CheckinReservationResponse, AppApiError, string, { snapshots: Array<[readonly unknown[], unknown]> }>({
    mutationFn: (reservationId) => lifecycleApi.checkinReservation(reservationId),
    onMutate: async (reservationId) => {
      await queryClient.cancelQueries({ queryKey: ['reservations'] });
      const snapshots = queryClient.getQueriesData({ queryKey: ['reservations'] });
      queryClient.setQueriesData<PaginatedReservations>({ queryKey: ['reservations'] }, (current) =>
        current
          ? {
              ...current,
              items: current.items.map((reservation) =>
                reservation.id === reservationId
                  ? { ...reservation, status: 'CHECKED_IN', checkedInAt: new Date().toISOString() }
                  : reservation
              ),
            }
          : current
      );
      return { snapshots };
    },
    onError: (_error, _reservationId, context) => {
      context?.snapshots.forEach(([key, value]) => queryClient.setQueryData(key, value));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
    },
  });
}
