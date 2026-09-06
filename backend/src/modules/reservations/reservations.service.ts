import { prisma } from '../../config/database.js';
import { AppError } from '../../shared/utils/errors.js';
import { CreateHoldInput, ConfirmReservationInput } from './reservations.schemas.js';

export class ReservationsService {
  async getWalletBalance(userId: string) {
    let wallet = await prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: {
          userId,
          balance: 10,
        },
      });
    }

    return {
      userId,
      availableCredits: wallet.balance,
      updatedAt: wallet.updatedAt.toISOString(),
    };
  }

  async createHold(userId: string, input: CreateHoldInput) {
    const resource = await prisma.resource.findUnique({
      where: { id: input.resourceId },
      include: { site: true },
    });

    if (!resource || !resource.isActive) {
      throw new AppError('RESOURCE_NOT_FOUND', `El recurso con ID ${input.resourceId} no existe.`, 404);
    }

    const startsAt = new Date(input.startsAt);
    const endsAt = new Date(input.endsAt);

    if (endsAt <= startsAt) {
      throw new AppError('VALIDATION_ERROR', 'endsAt debe ser posterior a startsAt.', 400);
    }

    const diffHours = (endsAt.getTime() - startsAt.getTime()) / (1000 * 60 * 60);
    const creditsRequired = Math.max(1, Math.ceil(diffHours * resource.creditsPerHour));

    // Validar solapamiento con bloqueos, reservas y holds activos
    const now = new Date();

    const conflictingBlock = await prisma.maintenanceBlock.findFirst({
      where: {
        resourceId: resource.id,
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
      },
    });

    if (conflictingBlock) {
      throw new AppError(
        'SLOT_UNAVAILABLE',
        'El horario solicitado está bloqueado por mantenimiento.',
        409
      );
    }

    const conflictingReservation = await prisma.reservation.findFirst({
      where: {
        resourceId: resource.id,
        status: { in: ['CONFIRMED', 'CHECKED_IN'] },
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
      },
    });

    if (conflictingReservation) {
      throw new AppError(
        'SLOT_UNAVAILABLE',
        'El horario solicitado ya se encuentra reservado.',
        409
      );
    }

    const conflictingHold = await prisma.hold.findFirst({
      where: {
        resourceId: resource.id,
        status: 'ACTIVE',
        expiresAt: { gt: now },
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
      },
    });

    if (conflictingHold) {
      throw new AppError(
        'SLOT_UNAVAILABLE',
        'El horario solicitado está temporalmente retenido por otro usuario. Intenta nuevamente en unos minutos.',
        409
      );
    }

    // Crear Hold con TTL de 300 segundos (5 minutos)
    const expiresAt = new Date(Date.now() + 300 * 1000);

    const hold = await prisma.hold.create({
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
      creditsRequired: hold.creditsRequired,
      expiresAt: hold.expiresAt.toISOString(),
    };
  }

  async releaseHold(userId: string, holdId: string) {
    const hold = await prisma.hold.findUnique({
      where: { id: holdId },
    });

    if (!hold) {
      throw new AppError('HOLD_NOT_FOUND', `El hold con ID ${holdId} no existe.`, 404);
    }

    if (hold.userId !== userId) {
      throw new AppError('FORBIDDEN', 'No tienes permiso para liberar este hold.', 403);
    }

    if (hold.status === 'ACTIVE') {
      await prisma.hold.update({
        where: { id: holdId },
        data: { status: 'RELEASED' },
      });
    }

    return { message: 'Hold liberado exitosamente.' };
  }

  async confirmReservation(userId: string, input: ConfirmReservationInput) {
    return prisma.$transaction(async (tx) => {
      const hold = await tx.hold.findUnique({
        where: { id: input.holdId },
        include: { resource: true },
      });

      if (!hold) {
        throw new AppError('HOLD_NOT_FOUND', `El hold con ID ${input.holdId} no existe.`, 404);
      }

      if (hold.userId !== userId) {
        throw new AppError('FORBIDDEN', 'Este hold pertenece a otro usuario.', 403);
      }

      if (hold.status !== 'ACTIVE' || hold.expiresAt < new Date()) {
        throw new AppError(
          'HOLD_EXPIRED',
          'La retención temporal de 5 minutos ha expirado. Por favor, selecciona el horario nuevamente.',
          410
        );
      }

      // Validar saldo en billetera
      let wallet = await tx.wallet.findUnique({
        where: { userId },
      });

      if (!wallet) {
        wallet = await tx.wallet.create({
          data: { userId, balance: 10 },
        });
      }

      if (wallet.balance < hold.creditsRequired) {
        throw new AppError(
          'INSUFFICIENT_CREDITS',
          `Saldo insuficiente. La reserva requiere ${hold.creditsRequired} créditos y dispones de ${wallet.balance} créditos.`,
          402,
          { required: hold.creditsRequired, available: wallet.balance }
        );
      }

      // 1. Marcar hold como CONSUMED
      await tx.hold.update({
        where: { id: hold.id },
        data: { status: 'CONSUMED' },
      });

      // 2. Descontar créditos de la billetera
      const newBalance = wallet.balance - hold.creditsRequired;
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: newBalance },
      });

      // 3. Crear reserva confirmada
      const reservation = await tx.reservation.create({
        data: {
          resourceId: hold.resourceId,
          userId,
          startsAt: hold.startsAt,
          endsAt: hold.endsAt,
          status: 'CONFIRMED',
          creditsDeducted: hold.creditsRequired,
          notes: input.userNotes,
        },
      });

      // 4. Registrar auditoría de transacción
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          userId,
          type: 'RESERVATION_CHARGE',
          amount: -hold.creditsRequired,
          balanceAfter: newBalance,
          description: `Reserva en ${hold.resource.name}`,
          referenceId: reservation.id,
        },
      });

      return {
        reservationId: reservation.id,
        resourceId: reservation.resourceId,
        startsAt: reservation.startsAt.toISOString(),
        endsAt: reservation.endsAt.toISOString(),
        status: reservation.status,
        creditsDeducted: reservation.creditsDeducted,
        walletBalanceRemaining: newBalance,
      };
    });
  }
}
