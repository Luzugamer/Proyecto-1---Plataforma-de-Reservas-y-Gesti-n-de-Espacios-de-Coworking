import { prisma } from '../../config/database.js';
import { AppError } from '../../shared/utils/errors.js';
import { PlanTier } from '@prisma/client';
import { SubscribePlanInput, TopupInput } from './membership.schemas.js';

export const TOPUP_PACKAGES = [
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

export class MembershipService {
  async getPlans() {
    return prisma.membershipPlan.findMany({
      orderBy: { pricePerMonth: 'asc' },
    });
  }

  async getCurrentSubscription(userId: string) {
    let sub = await prisma.subscription.findUnique({
      where: { userId },
      include: { plan: true },
    });

    if (!sub) {
      // Crear suscripción Starter por defecto si no existe
      sub = await prisma.subscription.create({
        data: {
          userId,
          planId: PlanTier.STARTER,
          status: 'ACTIVE',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          autoRenew: true,
        },
        include: { plan: true },
      });
    }

    return {
      planId: sub.planId,
      planName: sub.plan.name,
      monthlyCredits: sub.plan.monthlyCredits,
      status: sub.status,
      currentPeriodStart: sub.currentPeriodStart.toISOString(),
      currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
      autoRenew: sub.autoRenew,
    };
  }

  async subscribeToPlan(userId: string, input: SubscribePlanInput) {
    return prisma.$transaction(async (tx) => {
      const targetPlan = await tx.membershipPlan.findUnique({
        where: { id: input.planId },
      });

      if (!targetPlan) {
        throw new AppError('RESOURCE_NOT_FOUND', `El plan ${input.planId} no existe.`, 404);
      }

      let currentSub = await tx.subscription.findUnique({
        where: { userId },
        include: { plan: true },
      });

      const previousCredits = currentSub ? currentSub.plan.monthlyCredits : 10;
      const creditDifference = Math.max(0, targetPlan.monthlyCredits - previousCredits);

      // 1. Actualizar o crear suscripción
      const now = new Date();
      const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const updatedSub = await tx.subscription.upsert({
        where: { userId },
        update: {
          planId: targetPlan.id,
          status: 'ACTIVE',
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          autoRenew: true,
        },
        create: {
          userId,
          planId: targetPlan.id,
          status: 'ACTIVE',
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          autoRenew: true,
        },
        include: { plan: true },
      });

      // 2. Si es upgrade, acreditar la diferencia inmediatamente
      let wallet = await tx.wallet.findUnique({ where: { userId } });
      if (!wallet) {
        wallet = await tx.wallet.create({ data: { userId, balance: 10 } });
      }

      let newBalance = wallet.balance;
      if (creditDifference > 0) {
        newBalance += creditDifference;
        await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: newBalance },
        });

        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            userId,
            type: 'PLAN_UPGRADE_CREDIT',
            amount: creditDifference,
            balanceAfter: newBalance,
            description: `Upgrade a ${targetPlan.name}: +${creditDifference} créditos de diferencia asignados`,
            referenceId: targetPlan.id,
          },
        });
      }

      return {
        subscription: {
          planId: updatedSub.planId,
          planName: updatedSub.plan.name,
          monthlyCredits: updatedSub.plan.monthlyCredits,
          status: updatedSub.status,
          currentPeriodStart: updatedSub.currentPeriodStart.toISOString(),
          currentPeriodEnd: updatedSub.currentPeriodEnd.toISOString(),
          autoRenew: updatedSub.autoRenew,
        },
        creditedDifference: creditDifference,
        newBalance,
      };
    });
  }

  async getTopupPackages() {
    return TOPUP_PACKAGES;
  }

  async purchaseTopup(userId: string, input: TopupInput) {
    const pkg = TOPUP_PACKAGES.find((p) => p.id === input.packageId);

    if (!pkg) {
      throw new AppError('RESOURCE_NOT_FOUND', `El paquete con ID ${input.packageId} no existe.`, 404);
    }

    return prisma.$transaction(async (tx) => {
      let wallet = await tx.wallet.findUnique({ where: { userId } });
      if (!wallet) {
        wallet = await tx.wallet.create({ data: { userId, balance: 10 } });
      }

      const newBalance = wallet.balance + pkg.credits;
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: newBalance },
      });

      const txRecord = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          userId,
          type: 'TOPUP_PURCHASE',
          amount: pkg.credits,
          balanceAfter: newBalance,
          description: `Compra de ${pkg.label} ($${pkg.price} ${pkg.currency})`,
          referenceId: pkg.id,
        },
      });

      return {
        transactionId: txRecord.id,
        creditsAdded: pkg.credits,
        newBalance,
      };
    });
  }

  async getWalletTransactions(userId: string) {
    return prisma.walletTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}
