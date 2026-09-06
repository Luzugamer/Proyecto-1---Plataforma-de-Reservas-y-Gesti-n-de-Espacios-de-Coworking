export type PlanTier = 'STARTER' | 'PRO' | 'ENTERPRISE';

export interface MembershipPlan {
  id: PlanTier;
  name: string;
  monthlyCredits: number;
  pricePerMonth: number;
  currency: string;
  description: string;
  features: string[];
  isPopular?: boolean;
}

export interface UserSubscription {
  planId: PlanTier;
  planName: string;
  monthlyCredits: number;
  status: 'ACTIVE' | 'CANCELLED' | 'EXPIRED';
  currentPeriodStart: string; // ISO 8601
  currentPeriodEnd: string;   // ISO 8601
  autoRenew: boolean;
}

export type TransactionType =
  | 'MONTHLY_ALLOWANCE'
  | 'RESERVATION_CHARGE'
  | 'CANCELLATION_REFUND'
  | 'TOPUP_PURCHASE'
  | 'PLAN_UPGRADE_CREDIT'
  | 'ADMIN_ADJUSTMENT';

export interface WalletTransaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number; // Positivo para ingresos/reembolsos (+), negativo para cargos (-)
  balanceAfter: number;
  description: string;
  referenceId?: string; // reservationId, planId, etc.
  createdAt: string;    // ISO 8601
}

export interface TopupPackage {
  id: string;
  credits: number;
  price: number;
  currency: string;
  label: string;
  savingsBadge?: string;
}

export interface SubscribePlanRequest {
  planId: PlanTier;
}

export interface SubscribePlanResponse {
  subscription: UserSubscription;
  creditedDifference: number;
  newBalance: number;
}

export interface TopupRequest {
  packageId: string;
}

export interface TopupResponse {
  transactionId: string;
  creditsAdded: number;
  newBalance: number;
}
