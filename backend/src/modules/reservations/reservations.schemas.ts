import { z } from 'zod';

export const createHoldSchema = z.object({
  resourceId: z.string().min(1, 'resourceId es requerido.'),
  startsAt: z.string().datetime({ message: 'startsAt debe ser ISO 8601 UTC.' }),
  endsAt: z.string().datetime({ message: 'endsAt debe ser ISO 8601 UTC.' }),
});

export const confirmReservationSchema = z.object({
  holdId: z.string().min(1, 'holdId es requerido.'),
  userNotes: z.string().optional(),
});

export type CreateHoldInput = z.infer<typeof createHoldSchema>;
export type ConfirmReservationInput = z.infer<typeof confirmReservationSchema>;
