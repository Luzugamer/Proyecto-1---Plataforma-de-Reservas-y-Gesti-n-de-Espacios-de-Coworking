import { http, HttpResponse } from 'msw';
import {
  MembershipPlan,
  UserSubscription,
  WalletTransaction,
  TopupPackage,
  SubscribePlanRequest,
  SubscribePlanResponse,
  TopupRequest,
  TopupResponse,
} from '@/features/membership/types';
import { userBalances } from './reservations.handlers';

export const mockPlans: MembershipPlan[] = [
  {
    id: 'STARTER',
    name: 'Plan Starter',
    monthlyCredits: 10,
    pricePerMonth: 29,
    currency: 'USD',
    description: 'Ideal para freelancers y trabajadores independientes que necesitan acceso flexible.',
    features: [
      '10 créditos mensuales incluidos',
      'Acceso a zonas Hot Desk y Escritorios',
      'Reserva de salas con 7 días de anticipación',
      'WiFi de alta velocidad y café ilimitado',
      'Soporte por email',
    ],
  },
  {
    id: 'PRO',
    name: 'Plan Professional',
    monthlyCredits: 30,
    pricePerMonth: 69,
    currency: 'USD',
    description: 'Perfecto para profesionales y equipos pequeños que requieren reuniones frecuentes.',
    features: [
      '30 créditos mensuales incluidos',
      'Acceso prioritario a todas las sedes',
      'Reserva de salas con 30 días de anticipación',
      'Créditos válidos para salas 4K y directorios',
      'Soporte prioritario y casillero incluido',
    ],
    isPopular: true,
  },
  {
    id: 'ENTERPRISE',
    name: 'Plan Enterprise',
    monthlyCredits: 100,
    pricePerMonth: 199,
    currency: 'USD',
    description: 'Diseñado para empresas y startups en expansión con alta demanda colaborativa.',
    features: [
      '100 créditos mensuales incluidos',
      'Acceso ilimitado a todas las sedes y espacios',
      'Reserva anticipada sin límite de tiempo',
      'Invitados ilimitados a salas de directorio',
      'Gestor de cuenta dedicado y facturación corporativa',
    ],
  },
];

export const mockTopupPackages: TopupPackage[] = [
  {
    id: 'pkg_express_5',
    credits: 5,
    price: 18,
    currency: 'USD',
    label: 'Paquete Express (5 Créditos)',
  },
  {
    id: 'pkg_team_15',
    credits: 15,
    price: 45,
    currency: 'USD',
    label: 'Paquete Team (15 Créditos)',
    savingsBadge: 'Ahorra 15%',
  },
  {
    id: 'pkg_boost_30',
    credits: 30,
    price: 80,
    currency: 'USD',
    label: 'Paquete Boost (30 Créditos)',
    savingsBadge: 'Ahorra 25%',
  },
];

const now = Date.now();
const oneDay = 24 * 60 * 60 * 1000;

// Suscripción actual en memoria
let currentSubscription: UserSubscription = {
  planId: 'STARTER',
  planName: 'Plan Starter',
  monthlyCredits: 10,
  status: 'ACTIVE',
  currentPeriodStart: new Date(now - 10 * oneDay).toISOString(),
  currentPeriodEnd: new Date(now + 20 * oneDay).toISOString(),
  autoRenew: true,
};

// Historial inicial de transacciones
export const transactionsStore: WalletTransaction[] = [
  {
    id: 'tx_init_allowance',
    userId: 'u_member_01',
    type: 'MONTHLY_ALLOWANCE',
    amount: 10,
    balanceAfter: 10,
    description: 'Asignación mensual inicial — Plan Starter (10 créditos)',
    referenceId: 'sub_starter_01',
    createdAt: new Date(now - 10 * oneDay).toISOString(),
  },
];

export const membershipHandlers = [
  // GET */api/v1/memberships/plans
  http.get('*/api/v1/memberships/plans', () => {
    return HttpResponse.json(mockPlans, { status: 200 });
  }),

  // GET */api/v1/memberships/current
  http.get('*/api/v1/memberships/current', () => {
    return HttpResponse.json(currentSubscription, { status: 200 });
  }),

  // POST */api/v1/memberships/subscribe
  http.post('*/api/v1/memberships/subscribe', async ({ request }) => {
    const body = (await request.json()) as SubscribePlanRequest;
    const targetPlan = mockPlans.find((p) => p.id === body.planId);

    if (!targetPlan) {
      return HttpResponse.json(
        {
          error: {
            code: 'PLAN_NOT_FOUND',
            message: `El plan ${body.planId} no existe.`,
          },
        },
        { status: 404 }
      );
    }

    const previousCredits = currentSubscription.monthlyCredits;
    const creditDifference = Math.max(0, targetPlan.monthlyCredits - previousCredits);

    // Actualizar suscripción
    currentSubscription = {
      planId: targetPlan.id,
      planName: targetPlan.name,
      monthlyCredits: targetPlan.monthlyCredits,
      status: 'ACTIVE',
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date(Date.now() + 30 * oneDay).toISOString(),
      autoRenew: true,
    };

    // Actualizar balance sumando la diferencia inmediata si es upgrade
    const currentBal = userBalances.get('u_member_01') ?? 10;
    const newBal = currentBal + creditDifference;
    userBalances.set('u_member_01', newBal);

    if (creditDifference > 0) {
      transactionsStore.unshift({
        id: `tx_upg_${Date.now()}`,
        userId: 'u_member_01',
        type: 'PLAN_UPGRADE_CREDIT',
        amount: creditDifference,
        balanceAfter: newBal,
        description: `Upgrade a ${targetPlan.name}: +${creditDifference} créditos de diferencia asignados`,
        referenceId: targetPlan.id,
        createdAt: new Date().toISOString(),
      });
    }

    const response: SubscribePlanResponse = {
      subscription: currentSubscription,
      creditedDifference: creditDifference,
      newBalance: newBal,
    };

    return HttpResponse.json(response, { status: 200 });
  }),

  // GET */api/v1/wallet/transactions
  http.get('*/api/v1/wallet/transactions', () => {
    return HttpResponse.json(transactionsStore, { status: 200 });
  }),

  // GET */api/v1/wallet/topup/packages
  http.get('*/api/v1/wallet/topup/packages', () => {
    return HttpResponse.json(mockTopupPackages, { status: 200 });
  }),

  // POST */api/v1/wallet/topup
  http.post('*/api/v1/wallet/topup', async ({ request }) => {
    const body = (await request.json()) as TopupRequest;
    const pkg = mockTopupPackages.find((p) => p.id === body.packageId);

    if (!pkg) {
      return HttpResponse.json(
        {
          error: {
            code: 'PACKAGE_NOT_FOUND',
            message: `El paquete de créditos con ID ${body.packageId} no existe.`,
          },
        },
        { status: 404 }
      );
    }

    const currentBal = userBalances.get('u_member_01') ?? 10;
    const newBal = currentBal + pkg.credits;
    userBalances.set('u_member_01', newBal);

    const txId = `tx_topup_${Date.now()}`;
    transactionsStore.unshift({
      id: txId,
      userId: 'u_member_01',
      type: 'TOPUP_PURCHASE',
      amount: pkg.credits,
      balanceAfter: newBal,
      description: `Compra de ${pkg.label} ($${pkg.price} ${pkg.currency})`,
      referenceId: pkg.id,
      createdAt: new Date().toISOString(),
    });

    const response: TopupResponse = {
      transactionId: txId,
      creditsAdded: pkg.credits,
      newBalance: newBal,
    };

    return HttpResponse.json(response, { status: 200 });
  }),
];
