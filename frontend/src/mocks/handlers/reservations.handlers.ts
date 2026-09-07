import { http, HttpResponse } from 'msw';
import { CreateHoldRequest, CreateReservationRequest, HoldResponse, ReservationResponse } from '@/features/reservations/types';
import { mockResources } from './catalog.handlers';

interface MockHold {
  holdId: string;
  userId: string;
  resourceId: string;
  startsAt: string;
  endsAt: string;
  expiresAt: string;
  creditsRequired: number;
}

interface MockReservation {
  id: string;
  userId: string;
  resourceId: string;
  startsAt: string;
  endsAt: string;
  status: 'CONFIRMED' | 'CHECKED_IN' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  creditsDeducted: number;
  createdAt: string;
}

// Billeteras de créditos por usuario (RN-MEM)
export const userBalances: Map<string, number> = new Map([
  ['u_member_01', 10], // Miembro de prueba inicia con 10 créditos
  ['u_admin_01', 50],
  ['u_rec_01', 20],
]);

// Registro en memoria de holds activos
export const activeHolds: Map<string, MockHold> = new Map();

// Registro en memoria de reservas confirmadas
export const confirmedReservations: MockReservation[] = [];

export const reservationsHandlers = [
  // POST */api/v1/reservations/holds
  http.post('*/api/v1/reservations/holds', async ({ request }) => {
    const body = (await request.json()) as CreateHoldRequest;
    const { resourceId, startsAt, endsAt } = body;

    if (!resourceId || !startsAt || !endsAt) {
      return HttpResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'resourceId, startsAt y endsAt son requeridos.',
          },
        },
        { status: 400 }
      );
    }

    const resource = mockResources.find((r) => r.id === resourceId);
    if (!resource) {
      return HttpResponse.json(
        {
          error: {
            code: 'RESOURCE_NOT_FOUND',
            message: `El recurso con ID ${resourceId} no existe.`,
          },
        },
        { status: 404 }
      );
    }

    // Verificar si ya existe un hold activo o reserva confirmada en este slot (invariante de concurrencia)
    const now = Date.now();
    const isSlotHeld = Array.from(activeHolds.values()).some(
      (h) =>
        h.resourceId === resourceId &&
        Date.parse(h.expiresAt) > now &&
        ((startsAt >= h.startsAt && startsAt < h.endsAt) ||
          (endsAt > h.startsAt && endsAt <= h.endsAt))
    );

    const isSlotBooked = confirmedReservations.some(
      (r) =>
        r.resourceId === resourceId &&
        (r.status === 'CONFIRMED' || r.status === 'CHECKED_IN') &&
        ((startsAt >= r.startsAt && startsAt < r.endsAt) ||
          (endsAt > r.startsAt && endsAt <= r.endsAt))
    );

    if (isSlotHeld || isSlotBooked) {
      return HttpResponse.json(
        {
          error: {
            code: 'SLOT_UNAVAILABLE',
            message: 'El slot solicitado ya no está disponible (ha sido reservado o retenido).',
          },
        },
        { status: 409 }
      );
    }

    // Calcular créditos requeridos según duración en horas y costo del recurso
    const durationHours = Math.max(0.5, (Date.parse(endsAt) - Date.parse(startsAt)) / (1000 * 60 * 60));
    const creditsRequired = Math.max(1, Math.round(durationHours * (resource.creditCost.amount || 2)));

    // TTL de 300 segundos (5 minutos exactos según RN-RES.2)
    const expiresAt = new Date(now + 300 * 1000).toISOString();
    const holdId = `hold_${Date.now()}`;

    const newHold: MockHold = {
      holdId,
      userId: 'u_member_01',
      resourceId,
      startsAt,
      endsAt,
      expiresAt,
      creditsRequired,
    };

    activeHolds.set(holdId, newHold);

    const response: HoldResponse = {
      holdId: newHold.holdId,
      resourceId: newHold.resourceId,
      startsAt: newHold.startsAt,
      endsAt: newHold.endsAt,
      expiresAt: newHold.expiresAt,
      creditsRequired: newHold.creditsRequired,
    };

    return HttpResponse.json(response, { status: 201 });
  }),

  // DELETE */api/v1/reservations/holds/:holdId
  http.delete('*/api/v1/reservations/holds/:holdId', ({ params }) => {
    const { holdId } = params;

    if (!holdId || !activeHolds.has(holdId as string)) {
      return HttpResponse.json(
        {
          error: {
            code: 'HOLD_NOT_FOUND',
            message: `El hold ${holdId} no existe o ya fue liberado.`,
          },
        },
        { status: 404 }
      );
    }

    activeHolds.delete(holdId as string);
    return new HttpResponse(null, { status: 204 });
  }),

  // POST */api/v1/reservations
  http.post('*/api/v1/reservations', async ({ request }) => {
    const body = (await request.json()) as CreateReservationRequest;
    const { holdId } = body;

    if (!holdId) {
      return HttpResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'El holdId es requerido para confirmar la reserva.',
          },
        },
        { status: 400 }
      );
    }

    const hold = activeHolds.get(holdId);
    if (!hold) {
      return HttpResponse.json(
        {
          error: {
            code: 'HOLD_NOT_FOUND',
            message: 'El holdId no existe o ya fue utilizado.',
          },
        },
        { status: 404 }
      );
    }

    // Verificar si el hold ya expiró (> 300 segundos)
    if (Date.now() > Date.parse(hold.expiresAt)) {
      activeHolds.delete(holdId);
      return HttpResponse.json(
        {
          error: {
            code: 'HOLD_EXPIRED',
            message: 'El hold referenciado ya venció (>300s). El slot ha sido liberado.',
          },
        },
        { status: 410 }
      );
    }

    // Validar saldo de créditos del usuario (RN-MEM.4)
    const currentBalance = userBalances.get(hold.userId) ?? 10;
    if (currentBalance < hold.creditsRequired) {
      return HttpResponse.json(
        {
          error: {
            code: 'INSUFFICIENT_CREDITS',
            message: `Saldo insuficiente. Requieres ${hold.creditsRequired} créditos pero tu saldo actual es de ${currentBalance} créditos.`,
          },
        },
        { status: 402 }
      );
    }

    // Deducción atómica de créditos
    const newBalance = currentBalance - hold.creditsRequired;
    userBalances.set(hold.userId, newBalance);

    // Crear la reserva confirmada
    const reservationId = `resv_${Date.now()}`;
    const newReservation: MockReservation = {
      id: reservationId,
      userId: hold.userId,
      resourceId: hold.resourceId,
      startsAt: hold.startsAt,
      endsAt: hold.endsAt,
      status: 'CONFIRMED',
      creditsDeducted: hold.creditsRequired,
      createdAt: new Date().toISOString(),
    };

    confirmedReservations.push(newReservation);
    activeHolds.delete(holdId); // Liberar hold consumido

    const response: ReservationResponse = {
      reservationId: newReservation.id,
      resourceId: newReservation.resourceId,
      startsAt: newReservation.startsAt,
      endsAt: newReservation.endsAt,
      status: 'CONFIRMED',
      creditsDeducted: newReservation.creditsDeducted,
    };

    return HttpResponse.json(response, { status: 201 });
  }),

  // GET */api/v1/wallet/balance
  http.get('*/api/v1/wallet/balance', () => {
    const userId = 'u_member_01';
    const availableCredits = userBalances.get(userId) ?? 10;

    return HttpResponse.json(
      {
        userId,
        availableCredits,
        cycleEndsAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
      { status: 200 }
    );
  }),
];
