import { prisma } from '../../config/database.js';
import { AppError } from '../../shared/utils/errors.js';
import { assertWithinOperatingHours } from '../../shared/utils/dateTime.js';
import { lockHold, lockResource, lockUserWallet } from '../../shared/utils/postgresLocks.js';
import { calculateCredits, validateReservationDuration } from '../../shared/utils/reservationRules.js';
import { CreateHoldInput, ConfirmReservationInput } from './reservations.schemas.js';

export class ReservationsService {
  async getWalletBalance(userId: string) {
    const [wallet, subscription] = await Promise.all([
      prisma.wallet.findUnique({ where: { userId } }),
      prisma.subscription.findUnique({ where: { userId } }),
    ]);

    if (!wallet || !subscription) {
      throw new AppError('RESOURCE_NOT_FOUND', 'La billetera o membresía del usuario no existe.', 404);
    }

    return {
      userId,
      availableCredits: wallet.balance,
      cycleEndsAt: subscription.currentPeriodEnd.toISOString(),
    };
  }

  async createHold(userId: string, input: CreateHoldInput) {
    const startsAt = new Date(input.startsAt);
    const endsAt = new Date(input.endsAt);

    return prisma.$transaction(async (tx) => {
      await lockResource(tx, input.resourceId);
      const resource = await tx.resource.findUnique({
        where: { id: input.resourceId },
        include: { site: { include: { operatingHours: true } } },
      });

      if (!resource || !resource.isActive || !resource.site.isActive) {
        throw new AppError('RESOURCE_NOT_FOUND', `El recurso con ID ${input.resourceId} no existe.`, 404);
      }

      const durationMinutes = validateReservationDuration(resource.type, startsAt, endsAt);
      assertWithinOperatingHours(resource.site, startsAt, endsAt);
      const creditsRequired = calculateCredits(resource.type, resource.creditCostAmount, durationMinutes);
      const now = new Date();
      const [conflictingBlock, conflictingReservation, conflictingHold] = await Promise.all([
        tx.maintenanceBlock.findFirst({
          where: { resourceId: resource.id, startsAt: { lt: endsAt }, endsAt: { gt: startsAt } },
        }),
        tx.reservation.findFirst({
          where: {
            resourceId: resource.id,
            status: { in: ['CONFIRMED', 'CHECKED_IN'] },
            startsAt: { lt: endsAt },
            endsAt: { gt: startsAt },
          },
        }),
        tx.hold.findFirst({
          where: {
            resourceId: resource.id,
            status: 'ACTIVE',
            expiresAt: { gt: now },
            startsAt: { lt: endsAt },
            endsAt: { gt: startsAt },
          },
        }),
      ]);

      if (conflictingBlock || conflictingReservation || conflictingHold) {
        throw new AppError('SLOT_UNAVAILABLE', 'El intervalo solicitado ya no está disponible.', 409);
      }

      const expiresAt = new Date(now.getTime() + 300_000);
      const hold = await tx.hold.create({
        data: {
          resourceId: resource.id,
          userId,
          startsAt,
          endsAt,
          creditsRequired,
          expiresAt,
          status: 'ACTIVE',
        },
      });

      return {
        holdId: hold.id,
        resourceId: hold.resourceId,
        startsAt: hold.startsAt.toISOString(),
        endsAt: hold.endsAt.toISOString(),
        expiresAt: hold.expiresAt.toISOString(),
        creditsRequired: hold.creditsRequired,
      };
    });
  }

  async releaseHold(userId: string, holdId: string) {
    await prisma.$transaction(async (tx) => {
      await lockHold(tx, holdId);
      const hold = await tx.hold.findUnique({ where: { id: holdId } });
      if (!hold) throw new AppError('HOLD_NOT_FOUND', `El hold con ID ${holdId} no existe.`, 404);
      if (hold.userId !== userId) throw new AppError('FORBIDDEN', 'No tienes permiso para liberar este hold.', 403);
      if (hold.status === 'ACTIVE') {
        await tx.hold.update({ where: { id: holdId }, data: { status: 'RELEASED' } });
      }
    });
  }

  async confirmReservation(userId: string, input: ConfirmReservationInput) {
    return prisma.$transaction(async (tx) => {
      const holdReference = await tx.hold.findUnique({
        where: { id: input.holdId },
        select: { resourceId: true },
      });
      if (!holdReference) throw new AppError('HOLD_NOT_FOUND', `El hold con ID ${input.holdId} no existe.`, 404);
      await lockResource(tx, holdReference.resourceId);
      await lockHold(tx, input.holdId);
      const hold = await tx.hold.findUnique({ where: { id: input.holdId }, include: { resource: true } });
      if (!hold) throw new AppError('HOLD_NOT_FOUND', `El hold con ID ${input.holdId} no existe.`, 404);
      if (hold.userId !== userId) throw new AppError('FORBIDDEN', 'Este hold pertenece a otro usuario.', 403);
      if (hold.status === 'CONSUMED') throw new AppError('HOLD_NOT_FOUND', 'El hold ya fue utilizado.', 404);
      if (hold.status !== 'ACTIVE' || hold.expiresAt <= new Date()) {
        if (hold.status === 'ACTIVE') await tx.hold.update({ where: { id: hold.id }, data: { status: 'EXPIRED' } });
        throw new AppError('HOLD_EXPIRED', 'La retención temporal de 5 minutos expiró.', 410);
      }

      const [conflict, blocked] = await Promise.all([
        tx.reservation.findFirst({
          where: {
            resourceId: hold.resourceId,
            status: { in: ['CONFIRMED', 'CHECKED_IN'] },
            startsAt: { lt: hold.endsAt },
            endsAt: { gt: hold.startsAt },
          },
        }),
        tx.maintenanceBlock.findFirst({
          where: { resourceId: hold.resourceId, startsAt: { lt: hold.endsAt }, endsAt: { gt: hold.startsAt } },
        }),
      ]);
      if (conflict || blocked) throw new AppError('SLOT_UNAVAILABLE', 'El intervalo solicitado ya no está disponible.', 409);

      await lockUserWallet(tx, userId);
      const wallet = await tx.wallet.findUnique({ where: { userId } });
      if (!wallet || wallet.balance < hold.creditsRequired) {
        throw new AppError('INSUFFICIENT_CREDITS', 'Saldo insuficiente para confirmar la reserva.', 402, {
          required: hold.creditsRequired,
          available: wallet?.balance ?? 0,
        });
      }

      const newBalance = wallet.balance - hold.creditsRequired;
      const reservation = await tx.reservation.create({
        data: {
          resourceId: hold.resourceId,
          userId,
          startsAt: hold.startsAt,
          endsAt: hold.endsAt,
          status: 'CONFIRMED',
          creditsDeducted: hold.creditsRequired,
        },
      });
      await tx.wallet.update({ where: { id: wallet.id }, data: { balance: newBalance } });
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          userId,
          type: 'CONSUME',
          amount: -hold.creditsRequired,
          balanceAfter: newBalance,
          description: `Reserva en ${hold.resource.name}`,
          referenceId: reservation.id,
        },
      });
      await tx.hold.update({ where: { id: hold.id }, data: { status: 'CONSUMED' } });

      return {
        reservationId: reservation.id,
        resourceId: reservation.resourceId,
        startsAt: reservation.startsAt.toISOString(),
        endsAt: reservation.endsAt.toISOString(),
        status: reservation.status,
        creditsDeducted: reservation.creditsDeducted,
      };
    });
  }
}
