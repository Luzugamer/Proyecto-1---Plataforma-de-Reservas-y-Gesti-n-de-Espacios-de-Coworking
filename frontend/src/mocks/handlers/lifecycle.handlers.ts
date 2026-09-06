import { http, HttpResponse } from 'msw';
import { Reservation } from '@/features/lifecycle/types';
import { calculateEstimatedRefund, getCheckinWindowStatus } from '@/features/lifecycle/utils/refundCalculator';
import { confirmedReservations, userBalances } from './reservations.handlers';
import { mockResources } from './catalog.handlers';

// Reservas iniciales sembradas para QA en los diferentes umbrales temporales (RN-CAN y RN-CHK)
const now = Date.now();
const oneHour = 60 * 60 * 1000;
const oneDay = 24 * 60 * 60 * 1000;

export const seedReservations: Reservation[] = [
  // 1. Reserva Temprana (> 24h) -> 100% reembolso
  {
    id: 'resv_early_100',
    resourceId: 'res_01',
    resourceName: 'Sala de Reuniones Andes (Smart TV 4K & Pizarra)',
    siteName: 'Sede Miraflores — Hub Larco',
    userId: 'u_member_01',
    userName: 'Ana Torres',
    startsAt: new Date(now + 3 * oneDay).toISOString(),
    endsAt: new Date(now + 3 * oneDay + 2 * oneHour).toISOString(),
    status: 'CONFIRMED',
    creditsDeducted: 4,
    createdAt: new Date(now - 2 * oneHour).toISOString(),
  },
  // 2. Reserva Tardía (entre 24h y 2h) -> 50% reembolso
  {
    id: 'resv_late_50',
    resourceId: 'res_02',
    resourceName: 'Sala de Directorio Pacífica (Videoconferencia)',
    siteName: 'Sede Miraflores — Hub Larco',
    userId: 'u_member_01',
    userName: 'Ana Torres',
    startsAt: new Date(now + 5 * oneHour).toISOString(),
    endsAt: new Date(now + 7 * oneHour).toISOString(),
    status: 'CONFIRMED',
    creditsDeducted: 8,
    createdAt: new Date(now - 5 * oneHour).toISOString(),
  },
  // 3. Reserva Crítica (< 2h) -> 0% reembolso
  {
    id: 'resv_crit_0',
    resourceId: 'res_03',
    resourceName: 'Puesto Flexible — Zona Creativa A',
    siteName: 'Sede Miraflores — Hub Larco',
    userId: 'u_member_01',
    userName: 'Ana Torres',
    startsAt: new Date(now + 45 * 60 * 1000).toISOString(), // En 45 min
    endsAt: new Date(now + 45 * 60 * 1000 + 4 * oneHour).toISOString(),
    status: 'CONFIRMED',
    creditsDeducted: 1,
    createdAt: new Date(now - oneDay).toISOString(),
  },
  // 4. Reserva en Ventana Activa de Check-in (inicia en 5 minutos: ±15 min)
  {
    id: 'resv_checkin_ready',
    resourceId: 'res_05',
    resourceName: 'Sala Innovación (Proyector Láser)',
    siteName: 'Sede San Isidro — Financiero',
    userId: 'u_member_01',
    userName: 'Ana Torres',
    startsAt: new Date(now + 5 * 60 * 1000).toISOString(),
    endsAt: new Date(now + 5 * 60 * 1000 + oneHour).toISOString(),
    status: 'CONFIRMED',
    creditsDeducted: 3,
    createdAt: new Date(now - 3 * oneHour).toISOString(),
  },
  // 5. Reserva Histórica Completada
  {
    id: 'resv_completed_old',
    resourceId: 'res_01',
    resourceName: 'Sala de Reuniones Andes',
    siteName: 'Sede Miraflores — Hub Larco',
    userId: 'u_member_01',
    userName: 'Ana Torres',
    startsAt: new Date(now - 2 * oneDay).toISOString(),
    endsAt: new Date(now - 2 * oneDay + oneHour).toISOString(),
    status: 'COMPLETED',
    creditsDeducted: 2,
    checkedInAt: new Date(now - 2 * oneDay - 5 * 60 * 1000).toISOString(),
    createdAt: new Date(now - 4 * oneDay).toISOString(),
  },
  // 6. Reserva No-Show
  {
    id: 'resv_noshow_old',
    resourceId: 'res_02',
    resourceName: 'Sala de Directorio Pacífica',
    siteName: 'Sede Miraflores — Hub Larco',
    userId: 'u_member_01',
    userName: 'Ana Torres',
    startsAt: new Date(now - oneDay).toISOString(),
    endsAt: new Date(now - oneDay + oneHour).toISOString(),
    status: 'NO_SHOW',
    creditsDeducted: 4,
    createdAt: new Date(now - 3 * oneDay).toISOString(),
  },
];

// Estado mutable unificado de reservas
const allReservations: Map<string, Reservation> = new Map(
  seedReservations.map((r) => [r.id, r])
);

function syncReservations() {
  confirmedReservations.forEach((cr) => {
    if (!allReservations.has(cr.id)) {
      const res = mockResources.find((r) => r.id === cr.resourceId);
      allReservations.set(cr.id, {
        id: cr.id,
        resourceId: cr.resourceId,
        resourceName: res?.name || 'Espacio Reservado',
        siteName: res?.siteId === 'site_02' ? 'Sede San Isidro' : 'Sede Miraflores',
        userId: cr.userId,
        userName: 'Ana Torres (Miembro)',
        startsAt: cr.startsAt,
        endsAt: cr.endsAt,
        status: cr.status,
        creditsDeducted: cr.creditsDeducted,
        createdAt: cr.createdAt,
      });
    }
  });
}

export const lifecycleHandlers = [
  // GET */api/v1/reservations
  http.get('*/api/v1/reservations', ({ request }) => {
    const url = new URL(request.url);
    const statusFilter = url.searchParams.get('status');

    syncReservations();

    let items = Array.from(allReservations.values());

    if (statusFilter) {
      items = items.filter((r) => r.status === statusFilter);
    }

    // Ordenar de más reciente a más antigua
    items.sort((a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt));

    return HttpResponse.json(
      {
        items,
        page: 1,
        pageSize: items.length || 20,
        total: items.length,
      },
      { status: 200 }
    );
  }),

  // POST */api/v1/reservations/:id/cancel
  http.post('*/api/v1/reservations/:id/cancel', ({ params }) => {
    const { id } = params;
    syncReservations();
    const reservation = allReservations.get(id as string);

    if (!reservation) {
      return HttpResponse.json(
        {
          error: {
            code: 'RESOURCE_NOT_FOUND',
            message: `La reserva con ID ${id} no existe.`,
          },
        },
        { status: 404 }
      );
    }

    if (reservation.status !== 'CONFIRMED') {
      return HttpResponse.json(
        {
          error: {
            code: 'RESERVATION_NOT_CANCELLABLE',
            message: `La reserva no se puede cancelar porque su estado actual es ${reservation.status}.`,
          },
        },
        { status: 409 }
      );
    }

    // Calcular reembolso escalado (RN-CAN)
    const refund = calculateEstimatedRefund(reservation.startsAt, reservation.creditsDeducted);

    // Reembolsar créditos al balance del usuario en memoria
    const currentBalance = userBalances.get(reservation.userId) ?? 10;
    userBalances.set(reservation.userId, currentBalance + refund.refundedCredits);

    // Actualizar estado a CANCELLED
    reservation.status = 'CANCELLED';
    allReservations.set(reservation.id, reservation);

    return HttpResponse.json(
      {
        reservationId: reservation.id,
        status: 'CANCELLED',
        refundPercentage: refund.percentage,
        refundedCredits: refund.refundedCredits,
      },
      { status: 200 }
    );
  }),

  // POST */api/v1/reservations/:id/checkin
  http.post('*/api/v1/reservations/:id/checkin', ({ params }) => {
    const { id } = params;
    syncReservations();
    const reservation = allReservations.get(id as string);

    if (!reservation) {
      return HttpResponse.json(
        {
          error: {
            code: 'RESOURCE_NOT_FOUND',
            message: `La reserva con ID ${id} no existe.`,
          },
        },
        { status: 404 }
      );
    }

    if (reservation.status === 'CHECKED_IN') {
      return HttpResponse.json(
        {
          reservationId: reservation.id,
          status: 'CHECKED_IN',
          checkedInAt: reservation.checkedInAt || new Date().toISOString(),
        },
        { status: 200 }
      );
    }

    if (reservation.status !== 'CONFIRMED') {
      return HttpResponse.json(
        {
          error: {
            code: 'CHECKIN_WINDOW_CLOSED',
            message: `No se puede realizar check-in para una reserva en estado ${reservation.status}.`,
          },
        },
        { status: 409 }
      );
    }

    // Validar ventana ±15 min (RN-CHK)
    const windowCheck = getCheckinWindowStatus(reservation.startsAt);
    if (!windowCheck.isWithinWindow) {
      const detailMsg = windowCheck.isTooEarly
        ? `Aún es muy temprano para el check-in (se habilitará 15 min antes del inicio). Faltan ${windowCheck.minutesUntilStart} min.`
        : 'La ventana de tolerancia para check-in (15 min posteriores al inicio) ha expirado.';

      return HttpResponse.json(
        {
          error: {
            code: 'CHECKIN_WINDOW_CLOSED',
            message: `Check-in fuera de la ventana permitida (±15 min). ${detailMsg}`,
          },
        },
        { status: 409 }
      );
    }

    // Check-in exitoso
    const checkedInAt = new Date().toISOString();
    reservation.status = 'CHECKED_IN';
    reservation.checkedInAt = checkedInAt;
    allReservations.set(reservation.id, reservation);

    return HttpResponse.json(
      {
        reservationId: reservation.id,
        status: 'CHECKED_IN',
        checkedInAt,
      },
      { status: 200 }
    );
  }),
];
