import { httpClient } from '@/shared/api/httpClient';
import {
  PaginatedReservations,
  CancelReservationResponse,
  CheckinReservationResponse,
  GetReservationsParams,
} from './types';

export const lifecycleApi = {
  getReservations: (params?: GetReservationsParams): Promise<PaginatedReservations> => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.from) searchParams.set('from', params.from);
    if (params?.to) searchParams.set('to', params.to);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));

    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return httpClient.get<PaginatedReservations>(`/reservations${query}`);
  },

  cancelReservation: (reservationId: string): Promise<CancelReservationResponse> =>
    httpClient.post<CancelReservationResponse>(`/reservations/${reservationId}/cancel`),

  checkinReservation: (reservationId: string): Promise<CheckinReservationResponse> =>
    httpClient.post<CheckinReservationResponse>(`/reservations/${reservationId}/checkin`),
};
