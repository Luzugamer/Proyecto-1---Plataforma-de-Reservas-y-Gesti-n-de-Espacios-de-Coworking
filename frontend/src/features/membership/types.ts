export interface MembershipPlan {
  id: string;
  name: string;
  monthlyCredits: number;
  price: number;
  currency: string;
}

export type TransactionType = 'GRANT' | 'CONSUME' | 'REFUND' | 'EXPIRE';

export interface WalletTransaction {
  id: string;
  type: TransactionType;
  amount: number;
  balanceAfter: number;
  reservationId: string | null;
  createdAt: string;
}

export interface PaginatedLedger {
  items: WalletTransaction[];
  page: number;
  pageSize: number;
  total: number;
}

export interface LedgerParams {
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}
