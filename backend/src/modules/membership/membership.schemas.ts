import { z } from 'zod';
import { PlanTier } from '@prisma/client';

export const subscribePlanSchema = z.object({
  planId: z.nativeEnum(PlanTier, { message: 'planId debe ser STARTER, PRO o ENTERPRISE.' }),
});

export const topupSchema = z.object({
  packageId: z.string().min(1, 'packageId es requerido.'),
});

export type SubscribePlanInput = z.infer<typeof subscribePlanSchema>;
export type TopupInput = z.infer<typeof topupSchema>;
