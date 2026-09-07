import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database.js';
import { AppError } from '../../shared/utils/errors.js';
import { addCalendarMonth, getOperatingWindow } from '../../shared/utils/dateTime.js';
import { lockReservation, lockResource, lockUserWallet } from '../../shared/utils/postgresLocks.js';
import { GetResourcesQuery, GetAvailabilityQuery, CreateMaintenanceBlockInput } from './catalog.schemas.js';

type AvailabilityRow = {
  startsAt: Date;
  endsAt: Date;
  status: 'AVAILABLE' | 'HELD' | 'BOOKED' | 'BLOCKED';
  reason: string | null;
};

function creditCost(resource: {
  type: 'HOT_DESK' | 'DEDICATED_DESK' | 'MEETING_ROOM';
  creditCostAmount: number;
}) {
  if (resource.type === 'HOT_DESK') {
    return { amount: resource.creditCostAmount, unit: 'BLOCK_4_HOURS' as const, minBlockMinutes: 240 };
  }
  if (resource.type === 'DEDICATED_DESK') {
    return { amount: resource.creditCostAmount, unit: 'MONTH' as const, minBlockMinutes: 43_200 };
  }
  return {
    amount: resource.creditCostAmount,
    unit: 'HOUR' as const,
    minBlockMinutes: 30,
  };
}

export class CatalogService {
  async getSites() {
    const sites = await prisma.site.findMany({
      where: { isActive: true },
      include: { operatingHours: { orderBy: { dayOfWeek: 'asc' } } },
      orderBy: { name: 'asc' },
    });

    return sites.map((site) => ({
      id: site.id,
      name: site.name,
      address: site.address,
      operatingHours: site.operatingHours.map(({ dayOfWeek, opensAt, closesAt }) => ({
        dayOfWeek,
        opensAt,
        closesAt,
      })),
    }));
  }

  async getResourcesBySite(siteId: string, query: GetResourcesQuery) {
    const site = await prisma.site.findUnique({ where: { id: siteId } });
    if (!site) throw new AppError('RESOURCE_NOT_FOUND', `La sede con ID ${siteId} no existe.`, 404);

    const resources = await prisma.resource.findMany({
      where: { siteId, isActive: true, ...(query.type ? { type: query.type } : {}) },
      orderBy: { name: 'asc' },
    });
    return resources.map((resource) => ({
      id: resource.id,
      siteId: resource.siteId,
      type: resource.type,
      name: resource.name,
      capacity: resource.capacity,
      creditCost: creditCost(resource),
    }));
  }

  async getResourceById(resourceId: string) {
    const resource = await prisma.resource.findUnique({
      where: { id: resourceId },
      include: { site: { include: { operatingHours: true } } },
    });
    if (!resource || !resource.isActive) {
      throw new AppError('RESOURCE_NOT_FOUND', `El recurso con ID ${resourceId} no existe.`, 404);
    }
    return {
      id: resource.id,
      siteId: resource.siteId,
      type: resource.type,
      name: resource.name,
      capacity: resource.capacity,
      amenities: resource.amenities,
      creditCost: creditCost(resource),
      site: {
        id: resource.site.id,
        name: resource.site.name,
        address: resource.site.address,
        operatingHours: resource.site.operatingHours.map(({ dayOfWeek, opensAt, closesAt }) => ({
          dayOfWeek,
          opensAt,
          closesAt,
        })),
      },
    };
  }

  async getAvailability(resourceId: string, query: GetAvailabilityQuery) {
    const resource = await prisma.resource.findUnique({
      where: { id: resourceId },
      include: { site: { include: { operatingHours: true } } },
    });
    if (!resource || !resource.isActive) {
      throw new AppError('RESOURCE_NOT_FOUND', `El recurso con ID ${resourceId} no existe.`, 404);
    }

    const window = getOperatingWindow(resource.site, query.date);
    if (!window) return { resourceId, date: query.date, slots: [] };
    const rangeEnd = resource.type === 'DEDICATED_DESK' ? addCalendarMonth(window.start) : window.end;

    const slotSource = resource.type === 'DEDICATED_DESK'
      ? Prisma.sql`SELECT ${window.start}::timestamp AS "startsAt", ${rangeEnd}::timestamp AS "endsAt"`
      : Prisma.sql`
          SELECT value AS "startsAt", value + interval '30 minutes' AS "endsAt"
          FROM generate_series(
            ${window.start}::timestamp,
            ${window.end}::timestamp - interval '30 minutes',
            interval '30 minutes'
          ) AS value
        `;

    // PostgreSQL genera y clasifica todos los slots en una sola consulta indexada.
    const rows = await prisma.$queryRaw<AvailabilityRow[]>(Prisma.sql`
      WITH slots AS (${slotSource})
      SELECT
        slots."startsAt",
        slots."endsAt",
        CASE
          WHEN block.reason IS NOT NULL THEN 'BLOCKED'
          WHEN booking.found THEN 'BOOKED'
          WHEN active_hold.found THEN 'HELD'
          ELSE 'AVAILABLE'
        END AS status,
        block.reason
      FROM slots
      LEFT JOIN LATERAL (
        SELECT reason
        FROM maintenance_blocks
        WHERE "resourceId" = ${resourceId}
          AND "startsAt" < slots."endsAt" AND "endsAt" > slots."startsAt"
        LIMIT 1
      ) block ON true
      LEFT JOIN LATERAL (
        SELECT true AS found
        FROM reservations
        WHERE "resourceId" = ${resourceId}
          AND status IN ('CONFIRMED'::"ReservationStatus", 'CHECKED_IN'::"ReservationStatus")
          AND "startsAt" < slots."endsAt" AND "endsAt" > slots."startsAt"
        LIMIT 1
      ) booking ON true
      LEFT JOIN LATERAL (
        SELECT true AS found
        FROM holds
        WHERE "resourceId" = ${resourceId}
          AND status = 'ACTIVE'::"HoldStatus" AND "expiresAt" > NOW()
          AND "startsAt" < slots."endsAt" AND "endsAt" > slots."startsAt"
        LIMIT 1
      ) active_hold ON true
      ORDER BY slots."startsAt"
    `);

    const slots = rows.map((slot) => {
      return {
        startsAt: slot.startsAt.toISOString(),
        endsAt: slot.endsAt.toISOString(),
        status: slot.status,
        ...(slot.reason ? { reason: slot.reason } : {}),
      };
    });
    return { resourceId, date: query.date, slots };
  }

  async createMaintenanceBlock(resourceId: string, userId: string, input: CreateMaintenanceBlockInput) {
    const startsAt = new Date(input.startsAt);
    const endsAt = new Date(input.endsAt);
    if (endsAt <= startsAt) throw new AppError('VALIDATION_ERROR', 'endsAt debe ser posterior a startsAt.', 400);

    return prisma.$transaction(async (tx) => {
      await lockResource(tx, resourceId);
      const resource = await tx.resource.findUnique({ where: { id: resourceId } });
      if (!resource) throw new AppError('RESOURCE_NOT_FOUND', `El recurso con ID ${resourceId} no existe.`, 404);

      const assignment = await tx.siteStaff.findUnique({
        where: { siteId_userId: { siteId: resource.siteId, userId } },
      });
      if (!assignment) throw new AppError('FORBIDDEN', 'No administras la sede de este recurso.', 403);

      const reservations = await tx.reservation.findMany({
        where: {
          resourceId,
          status: { in: ['CONFIRMED', 'CHECKED_IN'] },
          startsAt: { lt: endsAt },
          endsAt: { gt: startsAt },
        },
        orderBy: [{ userId: 'asc' }, { id: 'asc' }],
      });
      const cancelledReservations: Array<{ reservationId: string; refundedCredits: number }> = [];

      for (const reservation of reservations) {
        await lockReservation(tx, reservation.id);
        await lockUserWallet(tx, reservation.userId);
        const wallet = await tx.wallet.findUnique({ where: { userId: reservation.userId } });
        if (!wallet) throw new Error(`Billetera ausente para usuario ${reservation.userId}`);
        const newBalance = wallet.balance + reservation.creditsDeducted;
        await tx.reservation.update({
          where: { id: reservation.id },
          data: { status: 'CANCELLED', refundedCredits: reservation.creditsDeducted },
        });
        await tx.wallet.update({ where: { id: wallet.id }, data: { balance: newBalance } });
        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            userId: reservation.userId,
            type: 'REFUND',
            amount: reservation.creditsDeducted,
            balanceAfter: newBalance,
            description: `Reembolso por bloqueo de mantenimiento: ${input.reason}`,
            referenceId: reservation.id,
          },
        });
        cancelledReservations.push({ reservationId: reservation.id, refundedCredits: reservation.creditsDeducted });
      }

      await tx.hold.updateMany({
        where: { resourceId, status: 'ACTIVE', startsAt: { lt: endsAt }, endsAt: { gt: startsAt } },
        data: { status: 'RELEASED' },
      });
      const block = await tx.maintenanceBlock.create({
        data: {
          resourceId,
          startsAt,
          endsAt,
          reason: input.reason,
          createdByUserId: userId,
          cancelledReservationsCount: cancelledReservations.length,
        },
      });
      return {
        blockId: block.id,
        resourceId: block.resourceId,
        startsAt: block.startsAt.toISOString(),
        endsAt: block.endsAt.toISOString(),
        reason: block.reason,
        cancelledReservations,
      };
    });
  }
}
