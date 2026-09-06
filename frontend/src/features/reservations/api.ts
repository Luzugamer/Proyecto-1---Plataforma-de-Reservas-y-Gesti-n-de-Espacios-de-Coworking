import { httpClient } from '@/shared/api/httpClient';
import {
  CreateHoldRequest,
  HoldResponse,
  CreateReservationRequest,
  ReservationResponse,
  WalletBalance,
} from './types';

export const reservationsApi = {
  createHold: (payload: CreateHoldRequest): Promise<HoldResponse> =>
    httpClient.post<HoldResponse>('/reservations/holds', payload),

  releaseHold: (holdId: string): Promise<void> =>
    httpClient.delete<void>(`/reservations/holds/${holdId}`),

  confirmReservation: (payload: CreateReservationRequest): Promise<ReservationResponse> =>
    httpClient.post<ReservationResponse>('/reservations', payload),

  getWalletBalance: (): Promise<WalletBalance> =>
    httpClient.get<WalletBalance>('/wallet/balance'),
};
