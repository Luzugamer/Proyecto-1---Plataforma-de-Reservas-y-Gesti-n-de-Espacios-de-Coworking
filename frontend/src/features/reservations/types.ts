export interface CreateHoldRequest {
  resourceId: string;
  startsAt: string; // ISO 8601 UTC
  endsAt: string;   // ISO 8601 UTC
}

export interface HoldResponse {
  holdId: string;
  resourceId: string;
  startsAt: string;
  endsAt: string;
  expiresAt: string; // ISO 8601 UTC (now + 300s)
  creditsRequired: number;
}

export interface CreateReservationRequest {
  holdId: string;
}

export interface ReservationResponse {
  reservationId: string;
  resourceId: string;
  startsAt: string;
  endsAt: string;
  status: 'CONFIRMED';
  creditsDeducted: number;
}

export interface WalletBalance {
  userId: string;
  availableCredits: number;
  cycleEndsAt: string; // ISO 8601 UTC
}
