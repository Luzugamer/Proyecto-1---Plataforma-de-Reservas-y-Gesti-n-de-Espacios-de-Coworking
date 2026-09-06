import { httpClient } from '@/shared/api/httpClient';
import {
  MembershipPlan,
  UserSubscription,
  WalletTransaction,
  TopupPackage,
  SubscribePlanRequest,
  SubscribePlanResponse,
  TopupRequest,
  TopupResponse,
} from './types';

export const membershipApi = {
  getPlans: (): Promise<MembershipPlan[]> =>
    httpClient.get<MembershipPlan[]>('/memberships/plans'),

  getCurrentSubscription: (): Promise<UserSubscription> =>
    httpClient.get<UserSubscription>('/memberships/current'),

  subscribeToPlan: (data: SubscribePlanRequest): Promise<SubscribePlanResponse> =>
    httpClient.post<SubscribePlanResponse>('/memberships/subscribe', data),

  getTransactions: (): Promise<WalletTransaction[]> =>
    httpClient.get<WalletTransaction[]>('/wallet/transactions'),

  getTopupPackages: (): Promise<TopupPackage[]> =>
    httpClient.get<TopupPackage[]>('/wallet/topup/packages'),

  purchaseTopup: (data: TopupRequest): Promise<TopupResponse> =>
    httpClient.post<TopupResponse>('/wallet/topup', data),
};
