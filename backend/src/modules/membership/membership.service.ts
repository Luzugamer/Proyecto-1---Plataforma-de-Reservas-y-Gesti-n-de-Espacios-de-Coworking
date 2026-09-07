import { prisma } from '../../config/database.js';
import { addCalendarMonth } from '../../shared/utils/dateTime.js';
import { lockUserWallet } from '../../shared/utils/postgresLocks.js';
import { LedgerQuery } from './membership.schemas.js';

export class MembershipService {
  async getPlans() {
    const plans = await prisma.membershipPlan.findMany({ orderBy: { pricePerMonth: 'asc' } });
    return plans.map((plan) => ({
      id: `plan_${plan.id.toLowerCase()}`,
      name: plan.name,
      monthlyCredits: plan.monthlyCredits,
      price: plan.pricePerMonth,
      currency: plan.currency,
    }));
  }

  async getWalletLedger(userId: string, query: LedgerQuery) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = {
      userId,
      ...(query.from || query.to
        ? { createdAt: { ...(query.from ? { gte: new Date(query.from) } : {}), ...(query.to ? { lte: new Date(query.to) } : {}) } }
        : {}),
    };
    const [items, total] = await Promise.all([
      prisma.walletTransaction.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      prisma.walletTransaction.count({ where }),
    ]);
    return {
      items: items.map((entry) => ({
        id: entry.id,
        type: entry.type,
        amount: entry.amount,
        balanceAfter: entry.balanceAfter,
        reservationId: entry.referenceId,
        createdAt: entry.createdAt.toISOString(),
      })),
      page,
      pageSize,
      total,
    };
  }

  async renewDueMemberships(now = new Date()) {
    const due = await prisma.subscription.findMany({
      where: { currentPeriodEnd: { lte: now } },
      select: { userId: true },
    });
    let processedUsers = 0;
    let totalCreditsGranted = 0;
    const failedUsers: Array<{ userId: string; reason: string }> = [];

    for (const { userId } of due) {
      try {
        const granted = await this.renewUserCycle(userId, now);
        if (granted !== null) {
          processedUsers += 1;
          totalCreditsGranted += granted;
        }
      } catch (error) {
        console.error(`No se pudo renovar el ciclo de ${userId}:`, error);
        failedUsers.push({
          userId,
          reason: error instanceof Error ? error.message : 'Error desconocido',
        });
      }
    }
    return { processedUsers, totalCreditsGranted, failedUsers };
  }

  private async renewUserCycle(userId: string, now: Date): Promise<number | null> {
    return prisma.$transaction(async (tx) => {
      await lockUserWallet(tx, userId);
      const subscription = await tx.subscription.findUnique({ where: { userId }, include: { plan: true } });
      if (!subscription || subscription.currentPeriodEnd > now) return null;
      const wallet = await tx.wallet.findUnique({ where: { userId } });
      if (!wallet) throw new Error(`Billetera ausente para usuario ${userId}`);

      if (wallet.balance > 0) {
        await tx.wallet.update({ where: { id: wallet.id }, data: { balance: 0 } });
        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            userId,
            type: 'EXPIRE',
            amount: -wallet.balance,
            balanceAfter: 0,
            description: 'Caducidad del saldo al cierre del ciclo',
          },
        });
      }
      let nextPeriodStart = subscription.currentPeriodEnd;
      let nextPeriodEnd = addCalendarMonth(nextPeriodStart);
      while (nextPeriodEnd <= now) {
        nextPeriodStart = nextPeriodEnd;
        nextPeriodEnd = addCalendarMonth(nextPeriodEnd);
      }
      if (subscription.status !== 'ACTIVE') {
        await tx.subscription.update({
          where: { id: subscription.id },
          data: {
            status: 'EXPIRED',
            currentPeriodStart: nextPeriodStart,
            currentPeriodEnd: nextPeriodEnd,
          },
        });
        return null;
      }

      const grant = subscription.plan.monthlyCredits;
      await tx.wallet.update({ where: { id: wallet.id }, data: { balance: grant } });
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          userId,
          type: 'GRANT',
          amount: grant,
          balanceAfter: grant,
          description: `Asignación mensual — ${subscription.plan.name}`,
        },
      });

      await tx.subscription.update({
        where: { id: subscription.id },
        data: { currentPeriodStart: nextPeriodStart, currentPeriodEnd: nextPeriodEnd },
      });
      return grant;
    });
  }
}
