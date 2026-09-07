import { z } from 'zod';
import { ResourceType } from '@prisma/client';

export const getResourcesQuerySchema = z.object({
  type: z.nativeEnum(ResourceType).optional(),
});

export const getAvailabilityQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'El formato de fecha debe ser YYYY-MM-DD.')
    .refine((value) => {
      const parsed = new Date(`${value}T00:00:00.000Z`);
      return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
    }, 'La fecha indicada no existe.'),
});

export const createMaintenanceBlockSchema = z.object({
  startsAt: z.string().datetime({ message: 'startsAt debe ser una fecha ISO 8601 UTC válida.' }),
  endsAt: z.string().datetime({ message: 'endsAt debe ser una fecha ISO 8601 UTC válida.' }),
  reason: z.string().min(5, 'El motivo del bloqueo debe tener al menos 5 caracteres.'),
});

export type GetResourcesQuery = z.infer<typeof getResourcesQuerySchema>;
export type GetAvailabilityQuery = z.infer<typeof getAvailabilityQuerySchema>;
export type CreateMaintenanceBlockInput = z.infer<typeof createMaintenanceBlockSchema>;
