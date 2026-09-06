import { prisma } from '../../config/database.js';
import { AppError } from '../../shared/utils/errors.js';
import {
  GetResourcesQuery,
  GetAvailabilityQuery,
  CreateMaintenanceBlockInput,
} from './catalog.schemas.js';

export class CatalogService {
  async getSites() {
    const sites = await prisma.site.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    return sites.map((site) => ({
      id: site.id,
      name: site.name,
      address: site.address,
      city: site.city,
      openingTime: site.openingTime,
      closingTime: site.closingTime,
      operatingHours: [
        {
          dayOfWeek: 'Lunes a Domingo',
          opensAt: site.openingTime,
          closesAt: site.closingTime,
        },
      ],
    }));
  }

  async getResourcesBySite(siteId: string, query: GetResourcesQuery) {
    const site = await prisma.site.findUnique({
      where: { id: siteId },
    });

    if (!site) {
      throw new AppError('RESOURCE_NOT_FOUND', `La sede con ID ${siteId} no existe.`, 404);
    }

    const resources = await prisma.resource.findMany({
      where: {
        siteId,
        isActive: true,
        ...(query.type ? { type: query.type } : {}),
      },
      orderBy: { name: 'asc' },
    });

    return resources.map((res) => ({
      id: res.id,
      siteId: res.siteId,
      name: res.name,
      type: res.type,
      capacity: res.capacity,
      creditsPerHour: res.creditsPerHour,
      amenities: res.amenities,
      creditCost: {
        amount: res.creditsPerHour,
        unit: 'HOUR' as const,
        minBlockMinutes: 30,
      },
    }));
  }

  async getResourceById(resourceId: string) {
    const resource = await prisma.resource.findUnique({
      where: { id: resourceId },
      include: { site: true },
    });

    if (!resource || !resource.isActive) {
      throw new AppError('RESOURCE_NOT_FOUND', `El recurso con ID ${resourceId} no existe.`, 404);
    }

    return {
      id: resource.id,
      siteId: resource.siteId,
      name: resource.name,
      type: resource.type,
      capacity: resource.capacity,
      creditsPerHour: resource.creditsPerHour,
      amenities: resource.amenities,
      creditCost: {
        amount: resource.creditsPerHour,
        unit: 'HOUR' as const,
        minBlockMinutes: 30,
      },
      site: {
        id: resource.site.id,
        name: resource.site.name,
        address: resource.site.address,
        city: resource.site.city,
        openingTime: resource.site.openingTime,
        closingTime: resource.site.closingTime,
        operatingHours: [
          {
            dayOfWeek: 'Lunes a Domingo',
            opensAt: resource.site.openingTime,
            closesAt: resource.site.closingTime,
          },
        ],
      },
    };
  }

  async getAvailability(resourceId: string, query: GetAvailabilityQuery) {
    const resource = await prisma.resource.findUnique({
      where: { id: resourceId },
      include: { site: true },
    });

    if (!resource || !resource.isActive) {
      throw new AppError('RESOURCE_NOT_FOUND', `El recurso con ID ${resourceId} no existe.`, 404);
    }

    const { date } = query; // YYYY-MM-DD
    const site = resource.site;

    const [openH, openM] = site.openingTime.split(':').map(Number);
    const [closeH, closeM] = site.closingTime.split(':').map(Number);

    const dayStart = new Date(`${date}T00:00:00.000Z`);
    const dayEnd = new Date(`${date}T23:59:59.999Z`);

    // Consultar bloqueos, reservas y holds en este rango de día
    const [blocks, reservations, holds] = await Promise.all([
      prisma.maintenanceBlock.findMany({
        where: {
          resourceId,
          startsAt: { lte: dayEnd },
          endsAt: { gte: dayStart },
        },
      }),
      prisma.reservation.findMany({
        where: {
          resourceId,
          status: { in: ['CONFIRMED', 'CHECKED_IN'] },
          startsAt: { lte: dayEnd },
          endsAt: { gte: dayStart },
        },
      }),
      prisma.hold.findMany({
        where: {
          resourceId,
          status: 'ACTIVE',
          expiresAt: { gt: new Date() },
          startsAt: { lte: dayEnd },
          endsAt: { gte: dayStart },
        },
      }),
    ]);

    // Generar slots de 30 minutos
    const slots = [];
    const openTotalMinutes = openH * 60 + openM;
    const closeTotalMinutes = closeH * 60 + closeM;

    for (let m = openTotalMinutes; m < closeTotalMinutes; m += 30) {
      const slotStartH = String(Math.floor(m / 60)).padStart(2, '0');
      const slotStartM = String(m % 60).padStart(2, '0');
      const nextM = m + 30;
      const slotEndH = String(Math.floor(nextM / 60)).padStart(2, '0');
      const slotEndM = String(nextM % 60).padStart(2, '0');

      const startsAt = new Date(`${date}T${slotStartH}:${slotStartM}:00.000Z`);
      const endsAt = new Date(`${date}T${slotEndH}:${slotEndM}:00.000Z`);

      // Evaluar estado del slot
      let status: 'AVAILABLE' | 'HELD' | 'BOOKED' | 'BLOCKED' = 'AVAILABLE';
      let reason: string | undefined;

      // 1. Bloqueo de mantenimiento
      const matchingBlock = blocks.find(
        (b) => b.startsAt < endsAt && b.endsAt > startsAt
      );
      if (matchingBlock) {
        status = 'BLOCKED';
        reason = matchingBlock.reason;
      } else {
        // 2. Reserva confirmada
        const matchingReservation = reservations.find(
          (r) => r.startsAt < endsAt && r.endsAt > startsAt
        );
        if (matchingReservation) {
          status = 'BOOKED';
        } else {
          // 3. Retención activa
          const matchingHold = holds.find(
            (h) => h.startsAt < endsAt && h.endsAt > startsAt
          );
          if (matchingHold) {
            status = 'HELD';
          }
        }
      }

      slots.push({
        slotId: `slot_${resourceId}_${date}_${slotStartH}${slotStartM}`,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        status,
        ...(reason ? { reason } : {}),
      });
    }

    return {
      resourceId,
      date,
      operatingHours: {
        open: site.openingTime,
        close: site.closingTime,
      },
      slots,
    };
  }

  async createMaintenanceBlock(
    resourceId: string,
    userId: string,
    input: CreateMaintenanceBlockInput
  ) {
    const resource = await prisma.resource.findUnique({
      where: { id: resourceId },
    });

    if (!resource) {
      throw new AppError('RESOURCE_NOT_FOUND', `El recurso con ID ${resourceId} no existe.`, 404);
    }

    const startsAt = new Date(input.startsAt);
    const endsAt = new Date(input.endsAt);

    if (endsAt <= startsAt) {
      throw new AppError('VALIDATION_ERROR', 'endsAt debe ser posterior a startsAt.', 400);
    }

    // Transacción atómica: buscar reservas solapadas, cancelarlas, reembolsar 100% y crear el bloqueo
    return prisma.$transaction(async (tx) => {
      // 1. Buscar reservas CONFIRMED solapadas
      const conflictingReservations = await tx.reservation.findMany({
        where: {
          resourceId,
          status: 'CONFIRMED',
          startsAt: { lt: endsAt },
          endsAt: { gt: startsAt },
        },
        include: { user: { include: { wallet: true } } },
      });

      // 2. Cancelar y reembolsar cada reserva solapada
      for (const res of conflictingReservations) {
        await tx.reservation.update({
          where: { id: res.id },
          data: {
            status: 'CANCELLED',
            refundedCredits: res.creditsDeducted,
          },
        });

        if (res.user.wallet) {
          const newBalance = res.user.wallet.balance + res.creditsDeducted;
          await tx.wallet.update({
            where: { id: res.user.wallet.id },
            data: { balance: newBalance },
          });

          await tx.walletTransaction.create({
            data: {
              walletId: res.user.wallet.id,
              userId: res.user.id,
              type: 'CANCELLATION_REFUND',
              amount: res.creditsDeducted,
              balanceAfter: newBalance,
              description: `Reembolso 100% por bloqueo de mantenimiento: "${input.reason}"`,
              referenceId: res.id,
            },
          });
        }
      }

      // 3. Cancelar holds activos solapados
      await tx.hold.updateMany({
        where: {
          resourceId,
          status: 'ACTIVE',
          startsAt: { lt: endsAt },
          endsAt: { gt: startsAt },
        },
        data: { status: 'RELEASED' },
      });

      // 4. Crear el registro de MaintenanceBlock
      const block = await tx.maintenanceBlock.create({
        data: {
          resourceId,
          startsAt,
          endsAt,
          reason: input.reason,
          createdByUserId: userId,
          cancelledReservationsCount: conflictingReservations.length,
        },
      });

      return {
        blockId: block.id,
        resourceId: block.resourceId,
        startsAt: block.startsAt.toISOString(),
        endsAt: block.endsAt.toISOString(),
        reason: block.reason,
        affectedReservationsCancelled: conflictingReservations.length,
      };
    });
  }
}
