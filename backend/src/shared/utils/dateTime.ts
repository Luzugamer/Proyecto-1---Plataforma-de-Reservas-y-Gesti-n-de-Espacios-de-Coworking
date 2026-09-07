import { DayOfWeek, OperatingHour, Site } from '@prisma/client';
import { AppError } from './errors.js';

const DAY_CODES: DayOfWeek[] = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

type SiteSchedule = Pick<Site, 'utcOffsetMinutes'> & {
  operatingHours: Pick<OperatingHour, 'dayOfWeek' | 'opensAt' | 'closesAt'>[];
};

export function addCalendarMonth(value: Date): Date {
  const result = new Date(value);
  const originalDay = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + 1);
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(originalDay, lastDay));
  return result;
}

export function localDateTimeToUtc(date: string, time: string, utcOffsetMinutes: number): Date {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour, minute) - utcOffsetMinutes * 60_000);
}

export function localDateForUtc(value: Date, utcOffsetMinutes: number): string {
  return new Date(value.getTime() + utcOffsetMinutes * 60_000).toISOString().slice(0, 10);
}

export function dayOfWeekForLocalDate(date: string): DayOfWeek {
  return DAY_CODES[new Date(`${date}T12:00:00.000Z`).getUTCDay()];
}

export function getOperatingWindow(site: SiteSchedule, localDate: string) {
  const dayOfWeek = dayOfWeekForLocalDate(localDate);
  const hours = site.operatingHours.find((entry) => entry.dayOfWeek === dayOfWeek);
  if (!hours) return null;
  return {
    dayOfWeek,
    opensAt: hours.opensAt,
    closesAt: hours.closesAt,
    start: localDateTimeToUtc(localDate, hours.opensAt, site.utcOffsetMinutes),
    end: localDateTimeToUtc(localDate, hours.closesAt, site.utcOffsetMinutes),
  };
}

export function assertWithinOperatingHours(site: SiteSchedule, startsAt: Date, endsAt: Date) {
  const startDate = localDateForUtc(startsAt, site.utcOffsetMinutes);
  const endDate = localDateForUtc(new Date(endsAt.getTime() - 1), site.utcOffsetMinutes);
  const window = getOperatingWindow(site, startDate);

  if (!window || endDate !== startDate || startsAt < window.start || endsAt > window.end) {
    throw new AppError(
      'OUT_OF_OPERATING_HOURS',
      'El rango solicitado está fuera del horario operativo de la sede.',
      409
    );
  }
}
