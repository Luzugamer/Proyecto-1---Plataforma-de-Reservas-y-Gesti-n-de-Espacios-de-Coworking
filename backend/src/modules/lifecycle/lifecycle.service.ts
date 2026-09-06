import { prisma } from '../../config/database.js';
import { AppError } from '../../shared/utils/errors.js';
import { ReservationStatus, UserRole } from '@prisma/client';

export class LifecycleService {
  async getReservations(
    userId: string,
    role: UserRole,
    query: {
      status?: string;
      page?: number;
      pageSize?: number;
    }
  ) {
    const page = Number(query.page || 1);
    const pageSize = Number(query.pageSize || 20);
    const skip = (page - 1) * pageSize;

    const where: {
      userId?: string;
      status?: ReservationStatus;
    } = {};

    // Si es miembro, solo ve sus propias reservas
    if (role === 'MEMBER') {
      where.userId = userId;
    }

    if (query.status) {
      where.status = query.status as ReservationStatus;
    }

    const [items, total] = await Promise.all([
      prisma.reservation.findMany({
        where,
        include: {
          resource: {
            include: { site: true },
          },
          user: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { startsAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.reservation.count({ where }),
    ]);

    return {
      items: items.map((r) => ({
        id: r.id,
        resourceId: r.resourceId,
        resourceName: r.resource.name,
        siteName: r.resource.site.name,
        userId: r.userId,
        userName: r.user.name,
        startsAt: r.startsAt.toISOString(),
        endsAt: r.endsAt.toISOString(),
        status: r.status,
        creditsDeducted: r.creditsDeducted,
        refundedCredits: r.refundedCredits,
        checkedInAt: r.checkedInAt?.toISOString() || null,
        notes: r.notes,
        createdAt: r.createdAt.toISOString(),
      })),
      page,
      pageSize,
      total,
    };
  }

  async cancelReservation(userId: string, role: UserRole, reservationId: string) {
    return prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.findUnique({
        where: { id: reservationId },
        include: { user: { include: { wallet: true } }, resource: true },
      });

      if (!reservation) {
        throw new AppError('RESOURCE_NOT_FOUND', `La reserva con ID ${reservationId} no existe.`, 404);
      }

      if (role === 'MEMBER' && reservation.userId !== userId) {
        throw new AppError('FORBIDDEN', 'No tienes permiso para cancelar esta reserva.', 403);
      }

      if (reservation.status !== 'CONFIRMED') {
        throw new AppError(
          'RESERVATION_NOT_CANCELLABLE',
          `La reserva no se puede cancelar porque su estado actual es ${reservation.status}.`,
          409
        );
      }

      // Regla RN-CAN: Cancelación escalada
      const now = Date.now();
      const startTime = reservation.startsAt.getTime();
      const diffHours = (startTime - now) / (1000 * 60 * 60);

      let refundPercentage: 100 | 50 | 0 = 0;
      let refundedCredits = 0;

      if (diffHours > 24) {
        refundPercentage = 100;
        refundedCredits = reservation.creditsDeducted;
      } else if (diffHours >= 2) {
        refundPercentage = 50;
        refundedCredits = Math.floor(reservation.creditsDeducted * 0.5);
      } else {
        refundPercentage = 0;
        refundedCredits = 0;
      }

      // 1. Actualizar estado de la reserva
      await tx.reservation.update({
        where: { id: reservation.id },
        data: {
          status: 'CANCELLED',
          refundedCredits,
        },
      });

      // 2. Reembolsar en billetera si aplica
      let newBalance = reservation.user.wallet?.balance ?? 10;
      if (refundedCredits > 0 && reservation.user.wallet) {
        newBalance += refundedCredits;
        await tx.wallet.update({
          where: { id: reservation.user.wallet.id },
          data: { balance: newBalance },
        });

        await tx.walletTransaction.create({
          data: {
            walletId: reservation.user.wallet.id,
            userId: reservation.user.id,
            type: 'CANCELLATION_REFUND',
            amount: refundedCredits,
            balanceAfter: newBalance,
            description: `Reembolso (${refundPercentage}%) por cancelación de reserva en ${reservation.resource.name}`,
            referenceId: reservation.id,
          },
        });
      }

      return {
        reservationId: reservation.id,
        status: 'CANCELLED' as const,
        refundPercentage,
        refundedCredits,
        walletBalance: newBalance,
      };
    });
  }

  async checkinReservation(userId: string, role: UserRole, reservationId: string) {
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
    });

    if (!reservation) {
      throw new AppError('RESOURCE_NOT_FOUND', `La reserva con ID ${reservationId} no existe.`, 404);
    }

    if (role === 'MEMBER' && reservation.userId !== userId) {
      throw new AppError('FORBIDDEN', 'No tienes permiso para hacer check-in en esta reserva.', 403);
    }

    if (reservation.status === 'CHECKED_IN') {
      return {
        reservationId: reservation.id,
        status: 'CHECKED_IN' as const,
        checkedInAt: reservation.checkedInAt?.toISOString() || new Date().toISOString(),
      };
    }

    if (reservation.status !== 'CONFIRMED') {
      throw new AppError(
        'CHECKIN_WINDOW_CLOSED',
        `No se puede realizar check-in para una reserva en estado ${reservation.status}.`,
        409
      );
    }

    // Regla RN-CHK: Ventana de tolerancia ±15 minutos respecto a startsAt
    const now = Date.now();
    const startTime = reservation.startsAt.getTime();
    const diffMinutes = (startTime - now) / (1000 * 60);

    const isWithinWindow = diffMinutes <= 15 && diffMinutes >= -15;

    if (!isWithinWindow) {
      const msg =
        diffMinutes > 15
          ? `Aún es muy temprano para el check-in (se habilitará 15 min antes del inicio). Faltan ${Math.round(
              diffMinutes
            )} min.`
          : 'La ventana de tolerancia para check-in (15 min posteriores al inicio) ha expirado.';

      throw new AppError(
        'CHECKIN_WINDOW_CLOSED',
        `Check-in fuera de la ventana permitida (±15 min). ${msg}`,
        409
      );
    }

    const checkedInAt = new Date();
    const updated = await prisma.reservation.update({
      where: { id: reservation.id },
      data: {
        status: 'CHECKED_IN',
        checkedInAt,
      },
    });

    return {
      reservationId: updated.id,
      status: 'CHECKED_IN' as const,
      checkedInAt: checkedInAt.toISOString(),
    };
  }
}
