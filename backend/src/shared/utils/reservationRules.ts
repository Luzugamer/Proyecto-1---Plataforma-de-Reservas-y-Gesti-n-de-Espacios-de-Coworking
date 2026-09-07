import { ResourceType } from '@prisma/client';
import { AppError } from './errors.js';

export function calculateCredits(
  type: ResourceType,
  creditCostAmount: number,
  durationMinutes: number
): number {
  if (type === 'MEETING_ROOM') {
    return Math.ceil((durationMinutes / 60) * creditCostAmount);
  }
  if (type === 'HOT_DESK') {
    return Math.ceil(durationMinutes / 240) * creditCostAmount;
  }
  throw new AppError(
    'VALIDATION_ERROR',
    'Los escritorios dedicados requieren el flujo mensual y no admiten holds por horas.',
    400
  );
}

export function validateReservationDuration(type: ResourceType, startsAt: Date, endsAt: Date) {
  const durationMinutes = (endsAt.getTime() - startsAt.getTime()) / 60_000;

  if (startsAt <= new Date()) {
    throw new AppError('VALIDATION_ERROR', 'startsAt debe estar en el futuro.', 400);
  }
  if (endsAt <= startsAt) {
    throw new AppError('VALIDATION_ERROR', 'endsAt debe ser posterior a startsAt.', 400);
  }
  if (startsAt.getUTCSeconds() !== 0 || startsAt.getUTCMilliseconds() !== 0 || startsAt.getUTCMinutes() % 30 !== 0) {
    throw new AppError('VALIDATION_ERROR', 'startsAt debe alinearse a bloques de 30 minutos.', 400);
  }
  if (endsAt.getUTCSeconds() !== 0 || endsAt.getUTCMilliseconds() !== 0 || endsAt.getUTCMinutes() % 30 !== 0) {
    throw new AppError('VALIDATION_ERROR', 'endsAt debe alinearse a bloques de 30 minutos.', 400);
  }
  if (type === 'MEETING_ROOM' && (durationMinutes < 30 || durationMinutes % 30 !== 0)) {
    throw new AppError('VALIDATION_ERROR', 'Una sala se reserva en bloques de al menos 30 minutos.', 400);
  }
  if (type === 'HOT_DESK' && (durationMinutes < 240 || durationMinutes % 240 !== 0)) {
    throw new AppError('VALIDATION_ERROR', 'Un hot desk se reserva en bloques de 4 horas.', 400);
  }
  if (type === 'DEDICATED_DESK') {
    throw new AppError(
      'VALIDATION_ERROR',
      'Los escritorios dedicados requieren el flujo mensual y no admiten holds por horas.',
      400
    );
  }

  return durationMinutes;
}
