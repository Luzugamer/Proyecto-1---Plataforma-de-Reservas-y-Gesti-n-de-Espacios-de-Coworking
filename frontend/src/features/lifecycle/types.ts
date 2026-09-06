export type ReservationStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CHECKED_IN'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

export interface Reservation {
  id: string;
  resourceId: string;
  resourceName?: string;
  siteName?: string;
  userId: string;
  userName?: string;
  startsAt: string; // ISO 8601 UTC
  endsAt: string;   // ISO 8601 UTC
  status: ReservationStatus;
  creditsDeducted: number;
  checkedInAt?: string | null;
  createdAt?: string;
}

export interface PaginatedReservations {
  items: Reservation[];
  page: number;
  pageSize: number;
  total: number;
}

export interface CancelReservationResponse {
  reservationId: string;
  status: 'CANCELLED';
  refundPercentage: number; // 100, 50, o 0
  refundedCredits: number;
}

export interface CheckinReservationResponse {
  reservationId: string;
  status: 'CHECKED_IN';
  checkedInAt: string;
}

export interface GetReservationsParams {
  status?: ReservationStatus | string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}
