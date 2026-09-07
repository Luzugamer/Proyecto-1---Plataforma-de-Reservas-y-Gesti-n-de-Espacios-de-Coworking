import { ReservationStatus } from '@prisma/client';
import { z } from 'zod';

export const reservationsQuerySchema = z
  .object({
    status: z.nativeEnum(ReservationStatus).optional(),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .refine((query) => !query.from || !query.to || new Date(query.from) <= new Date(query.to), {
    message: 'from debe ser anterior o igual a to.',
  });
