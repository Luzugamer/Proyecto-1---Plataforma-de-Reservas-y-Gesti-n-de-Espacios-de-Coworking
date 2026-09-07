import { Prisma, ReservationStatus, UserRole } from '@prisma/client';
import { prisma } from '../../config/database.js';
import { AppError } from '../../shared/utils/errors.js';
import { lockReservation, lockResource, lockUserWallet } from '../../shared/utils/postgresLocks.js';
import { calculateRefund } from '../../shared/utils/refundCalculator.js';

type ReservationQuery = {
  status?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
};

async function assertReservationAccess(
  tx: Prisma.TransactionClient,
  userId: string,
  role: UserRole,
  reservation: { userId: string; resource: { siteId: string } }
) {
  if (role === 'MEMBER') {
    if (reservation.userId !== userId) throw new AppError('FORBIDDEN', 'No tienes permiso para esta reserva.', 403);
    return;
  }
  const assignment = await tx.siteStaff.findUnique({
    where: { siteId_userId: { siteId: reservation.resource.siteId, userId } },
  });
  if (!assignment) throw new AppError('FORBIDDEN', 'No estás asignado a la sede de esta reserva.', 403);
}

export class LifecycleService {
  async getReservations(userId: string, role: UserRole, query: ReservationQuery) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.ReservationWhereInput = {};

    if (role === 'MEMBER') {
      where.userId = userId;
    } else {
      where.resource = { site: { staffAssignments: { some: { userId } } } };
    }
    if (query.status) where.status = query.status as ReservationStatus;
    if (query.from || query.to) {
      where.startsAt = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      };
    }

    const [items, total] = await Promise.all([
      prisma.reservation.findMany({
        where,
        include: {
          resource: { include: { site: true } },
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { startsAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.reservation.count({ where }),
    ]);

    return {
      items: items.map((reservation) => ({
        id: reservation.id,
        resourceId: reservation.resourceId,
        resourceName: reservation.resource.name,
        siteName: reservation.resource.site.name,
        userId: reservation.userId,
        userName: reservation.user.name,
        startsAt: reservation.startsAt.toISOString(),
        endsAt: reservation.endsAt.toISOString(),
        status: reservation.status,
        creditsDeducted: reservation.creditsDeducted,
        refundedCredits: reservation.refundedCredits,
        checkedInAt: reservation.checkedInAt?.toISOString() ?? null,
        notes: reservation.notes,
        createdAt: reservation.createdAt.toISOString(),
      })),
      page,
      pageSize,
      total,
    };
  }

  async cancelReservation(userId: string, role: UserRole, reservationId: string) {
    return prisma.$transaction(async (tx) => {
      const reference = await tx.reservation.findUnique({ where: { id: reservationId }, select: { resourceId: true } });
      if (!reference) throw new AppError('RESOURCE_NOT_FOUND', `La reserva con ID ${reservationId} no existe.`, 404);
      await lockResource(tx, reference.resourceId);
      await lockReservation(tx, reservationId);
      const reservation = await tx.reservation.findUnique({
        where: { id: reservationId },
        include: { resource: true },
      });
      if (!reservation) throw new AppError('RESOURCE_NOT_FOUND', `La reserva con ID ${reservationId} no existe.`, 404);
      await assertReservationAccess(tx, userId, role, reservation);
      if (!['CONFIRMED', 'CHECKED_IN'].includes(reservation.status)) {
        throw new AppError('RESERVATION_NOT_CANCELLABLE', `La reserva no se puede cancelar en estado ${reservation.status}.`, 409);
      }

      const { refundPercentage, refundedCredits } = calculateRefund(
        reservation.startsAt,
        new Date(),
        reservation.creditsDeducted
      );
      await tx.reservation.update({
        where: { id: reservation.id },
        data: { status: 'CANCELLED', refundedCredits },
      });

      if (refundedCredits > 0) {
        await lockUserWallet(tx, reservation.userId);
        const wallet = await tx.wallet.findUnique({ where: { userId: reservation.userId } });
        if (!wallet) throw new Error(`Billetera ausente para usuario ${reservation.userId}`);
        const balanceAfter = wallet.balance + refundedCredits;
        await tx.wallet.update({ where: { id: wallet.id }, data: { balance: balanceAfter } });
        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            userId: reservation.userId,
            type: 'REFUND',
            amount: refundedCredits,
            balanceAfter,
            description: `Reembolso (${refundPercentage}%) por cancelación en ${reservation.resource.name}`,
            referenceId: reservation.id,
          },
        });
      }

      return {
        reservationId: reservation.id,
        status: 'CANCELLED' as const,
        refundPercentage,
        refundedCredits,
      };
    });
  }

  async checkinReservation(userId: string, role: UserRole, reservationId: string) {
    return prisma.$transaction(async (tx) => {
      const reference = await tx.reservation.findUnique({ where: { id: reservationId }, select: { resourceId: true } });
      if (!reference) throw new AppError('RESOURCE_NOT_FOUND', `La reserva con ID ${reservationId} no existe.`, 404);
      await lockResource(tx, reference.resourceId);
      await lockReservation(tx, reservationId);
      const reservation = await tx.reservation.findUnique({
        where: { id: reservationId },
        include: { resource: true },
      });
      if (!reservation) throw new AppError('RESOURCE_NOT_FOUND', `La reserva con ID ${reservationId} no existe.`, 404);
      await assertReservationAccess(tx, userId, role, reservation);

      if (reservation.status === 'CHECKED_IN') {
        return {
          reservationId: reservation.id,
          status: 'CHECKED_IN' as const,
          checkedInAt: reservation.checkedInAt!.toISOString(),
        };
      }
      if (reservation.status !== 'CONFIRMED') {
        throw new AppError('CHECKIN_WINDOW_CLOSED', `No se puede hacer check-in en estado ${reservation.status}.`, 409);
      }
      const now = new Date();
      const minutesFromStart = (now.getTime() - reservation.startsAt.getTime()) / 60_000;
      if (minutesFromStart < -15 || minutesFromStart > 15) {
        throw new AppError('CHECKIN_WINDOW_CLOSED', 'El check-in solo está disponible entre 15 min antes y 15 min después del inicio.', 409);
      }

      const updated = await tx.reservation.update({
        where: { id: reservation.id },
        data: { status: 'CHECKED_IN', checkedInAt: now },
      });
      return { reservationId: updated.id, status: 'CHECKED_IN' as const, checkedInAt: now.toISOString() };
    });
  }
}
