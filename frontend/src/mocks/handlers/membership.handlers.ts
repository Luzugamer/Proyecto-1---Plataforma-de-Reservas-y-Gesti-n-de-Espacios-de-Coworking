import { http, HttpResponse } from 'msw';
import { MembershipPlan, WalletTransaction } from '@/features/membership/types';

const plans: MembershipPlan[] = [
  { id: 'plan_starter', name: 'Starter', monthlyCredits: 10, price: 29, currency: 'PEN' },
  { id: 'plan_pro', name: 'Pro', monthlyCredits: 30, price: 79, currency: 'PEN' },
  { id: 'plan_enterprise', name: 'Enterprise', monthlyCredits: 100, price: 199, currency: 'PEN' },
];
const ledger: WalletTransaction[] = [
  { id: 'led_01', type: 'GRANT', amount: 10, balanceAfter: 10, reservationId: null, createdAt: new Date().toISOString() },
  { id: 'led_02', type: 'CONSUME', amount: -2, balanceAfter: 8, reservationId: 'resv_01', createdAt: new Date(Date.now() - 60_000).toISOString() },
  { id: 'led_03', type: 'REFUND', amount: 1, balanceAfter: 9, reservationId: 'resv_02', createdAt: new Date(Date.now() - 120_000).toISOString() },
  { id: 'led_04', type: 'EXPIRE', amount: -9, balanceAfter: 0, reservationId: null, createdAt: new Date(Date.now() - 180_000).toISOString() },
];

export const membershipHandlers = [
  http.get('*/api/v1/plans', () => HttpResponse.json(plans)),
  http.get('*/api/v1/wallet/ledger', ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? 1);
    const pageSize = Number(url.searchParams.get('pageSize') ?? 20);
    const start = (page - 1) * pageSize;
    return HttpResponse.json({ items: ledger.slice(start, start + pageSize), page, pageSize, total: ledger.length });
  }),
];
