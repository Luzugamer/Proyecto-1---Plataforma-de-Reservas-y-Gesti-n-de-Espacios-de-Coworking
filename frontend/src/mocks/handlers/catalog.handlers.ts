import { http, HttpResponse } from 'msw';
import { Site, Resource, ResourceType, AvailabilitySlot, BlockResourceRequest } from '@/features/catalog/types';

// Base de datos en memoria para Sedes
export const mockSites: Site[] = [
  {
    id: 'site_01',
    name: 'Sede Miraflores — Hub Larco',
    address: 'Av. José Larco 742, Miraflores, Lima',
    operatingHours: [
      { dayOfWeek: 'MON', opensAt: '08:00', closesAt: '20:00' },
      { dayOfWeek: 'TUE', opensAt: '08:00', closesAt: '20:00' },
      { dayOfWeek: 'WED', opensAt: '08:00', closesAt: '20:00' },
      { dayOfWeek: 'THU', opensAt: '08:00', closesAt: '20:00' },
      { dayOfWeek: 'FRI', opensAt: '08:00', closesAt: '20:00' },
      { dayOfWeek: 'SAT', opensAt: '09:00', closesAt: '18:00' },
    ],
  },
  {
    id: 'site_02',
    name: 'Sede San Isidro — Financiero',
    address: 'Av. Rivera Navarrete 525, San Isidro, Lima',
    operatingHours: [
      { dayOfWeek: 'MON', opensAt: '07:30', closesAt: '21:00' },
      { dayOfWeek: 'TUE', opensAt: '07:30', closesAt: '21:00' },
      { dayOfWeek: 'WED', opensAt: '07:30', closesAt: '21:00' },
      { dayOfWeek: 'THU', opensAt: '07:30', closesAt: '21:00' },
      { dayOfWeek: 'FRI', opensAt: '07:30', closesAt: '21:00' },
    ],
  },
];

// Base de datos en memoria para Recursos
export const mockResources: Resource[] = [
  {
    id: 'res_01',
    siteId: 'site_01',
    type: 'MEETING_ROOM',
    name: 'Sala de Reuniones Andes (Smart TV 4K & Pizarra)',
    capacity: 6,
    creditCost: { amount: 2, unit: 'HOUR', minBlockMinutes: 30 },
  },
  {
    id: 'res_02',
    siteId: 'site_01',
    type: 'MEETING_ROOM',
    name: 'Sala de Directorio Pacífica (Videoconferencia)',
    capacity: 12,
    creditCost: { amount: 4, unit: 'HOUR', minBlockMinutes: 30 },
  },
  {
    id: 'res_03',
    siteId: 'site_01',
    type: 'HOT_DESK',
    name: 'Puesto Flexible — Zona Creativa A',
    capacity: 1,
    creditCost: { amount: 1, unit: 'HOUR', minBlockMinutes: 240 },
  },
  {
    id: 'res_04',
    siteId: 'site_01',
    type: 'DEDICATED_DESK',
    name: 'Escritorio Dedicado D-101 (Monitor 27" y Cajonera)',
    capacity: 1,
    creditCost: { amount: 30, unit: 'MONTH', minBlockMinutes: 43200 },
  },
  {
    id: 'res_05',
    siteId: 'site_02',
    type: 'MEETING_ROOM',
    name: 'Sala Innovación (Proyector Láser)',
    capacity: 8,
    creditCost: { amount: 3, unit: 'HOUR', minBlockMinutes: 30 },
  },
  {
    id: 'res_06',
    siteId: 'site_02',
    type: 'HOT_DESK',
    name: 'Puesto Flexible — Zona Silenciosa B',
    capacity: 1,
    creditCost: { amount: 1, unit: 'HOUR', minBlockMinutes: 240 },
  },
];

// Registro en memoria de bloques administrativos activos
interface AdminBlock {
  blockId: string;
  resourceId: string;
  startsAt: string;
  endsAt: string;
  reason: string;
}

const activeBlocks: AdminBlock[] = [];

// Generador de slots de 30 minutos para disponibilidad
function generateSlotsForDate(resourceId: string, dateStr: string): AvailabilitySlot[] {
  const slots: AvailabilitySlot[] = [];
  const startHour = 8;
  const endHour = 20;

  for (let hour = startHour; hour < endHour; hour++) {
    for (let min = 0; min < 60; min += 30) {
      const padHour = String(hour).padStart(2, '0');
      const padMin = String(min).padStart(2, '0');
      const nextMin = min + 30 === 60 ? '00' : '30';
      const nextHour = min + 30 === 60 ? String(hour + 1).padStart(2, '0') : padHour;

      const startsAt = `${dateStr}T${padHour}:${padMin}:00Z`;
      const endsAt = `${dateStr}T${nextHour}:${nextMin}:00Z`;

      // Comprobar si cae dentro de algún bloqueo administrativo activo
      const isBlocked = activeBlocks.some(
        (b) => b.resourceId === resourceId && startsAt >= b.startsAt && endsAt <= b.endsAt
      );

      let status: AvailabilitySlot['status'] = 'AVAILABLE';

      if (isBlocked) {
        status = 'BLOCKED';
      } else {
        // Datos semilla demostrativos para probar visualmente los 4 estados
        if (hour === 9 && min === 0) {
          status = 'BOOKED';
        } else if (hour === 9 && min === 30) {
          status = 'BOOKED';
        } else if (hour === 11 && min === 0) {
          status = 'HELD';
        } else if (hour === 15 && min === 0) {
          status = 'BLOCKED';
        }
      }

      slots.push({ startsAt, endsAt, status });
    }
  }

  return slots;
}

export const catalogHandlers = [
  // GET */api/v1/sites
  http.get('*/api/v1/sites', () => {
    return HttpResponse.json(mockSites, { status: 200 });
  }),

  // GET */api/v1/sites/:siteId/resources
  http.get('*/api/v1/sites/:siteId/resources', ({ params, request }) => {
    const { siteId } = params;
    const url = new URL(request.url);
    const typeFilter = url.searchParams.get('type') as ResourceType | null;

    const siteExists = mockSites.some((s) => s.id === siteId);
    if (!siteExists) {
      return HttpResponse.json(
        {
          error: {
            code: 'RESOURCE_NOT_FOUND',
            message: `La sede con ID ${siteId} no existe.`,
          },
        },
        { status: 404 }
      );
    }

    let filtered = mockResources.filter((r) => r.siteId === siteId);
    if (typeFilter) {
      filtered = filtered.filter((r) => r.type === typeFilter);
    }

    return HttpResponse.json(filtered, { status: 200 });
  }),

  // GET */api/v1/resources/:resourceId/availability
  http.get('*/api/v1/resources/:resourceId/availability', ({ params, request }) => {
    const { resourceId } = params;
    const url = new URL(request.url);
    const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];

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

    const slots = generateSlotsForDate(resourceId as string, date);

    return HttpResponse.json(
      {
        resourceId,
        date,
        slots,
      },
      { status: 200 }
    );
  }),

  // POST */api/v1/admin/resources/:resourceId/blocks
  http.post('*/api/v1/admin/resources/:resourceId/blocks', async ({ params, request }) => {
    const { resourceId } = params;
    const body = (await request.json()) as BlockResourceRequest;
    const { startsAt, endsAt, reason } = body;

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

    if (!startsAt || !endsAt || !reason) {
      return HttpResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Rango de fechas y motivo son requeridos.',
          },
        },
        { status: 400 }
      );
    }

    const newBlock: AdminBlock = {
      blockId: `blk_${Date.now()}`,
      resourceId: resourceId as string,
      startsAt,
      endsAt,
      reason,
    };

    activeBlocks.push(newBlock);

    // Simular cancelación de reservas existentes en ese rango con reembolso de créditos (HU-02)
    return HttpResponse.json(
      {
        blockId: newBlock.blockId,
        resourceId: newBlock.resourceId,
        startsAt: newBlock.startsAt,
        endsAt: newBlock.endsAt,
        reason: newBlock.reason,
        cancelledReservations: [
          {
            reservationId: `resv_impact_${Date.now()}`,
            refundedCredits: resource.creditCost.amount * 2,
          },
        ],
      },
      { status: 201 }
    );
  }),
];
