import { prisma } from '../config/database.js';
import { MembershipService } from '../modules/membership/membership.service.js';

const INTERVAL_MS = 60_000;

export async function expireHolds(now = new Date()) {
  return prisma.hold.updateMany({
    where: { status: 'ACTIVE', expiresAt: { lte: now } },
    data: { status: 'EXPIRED' },
  });
}

export async function markNoShows(now = new Date()) {
  const cutoff = new Date(now.getTime() - 15 * 60_000);
  return prisma.reservation.updateMany({
    where: { status: 'CONFIRMED', startsAt: { lt: cutoff } },
    data: { status: 'NO_SHOW' },
  });
}

export async function pruneLoginAttempts(now = new Date()) {
  return prisma.loginAttempt.deleteMany({
    where: {
      OR: [
        { lockedUntil: { lte: now } },
        { lockedUntil: null, windowStartedAt: { lte: new Date(now.getTime() - 15 * 60_000) } },
      ],
    },
  });
}

export function startBackgroundJobs() {
  const memberships = new MembershipService();
  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try {
      const now = new Date();
      await Promise.all([expireHolds(now), markNoShows(now), pruneLoginAttempts(now)]);
      await memberships.renewDueMemberships(now);
    } catch (error) {
      console.error('Error en jobs de mantenimiento:', error);
    } finally {
      running = false;
    }
  };

  void run();
  const timer = setInterval(() => void run(), INTERVAL_MS);
  timer.unref();
  return () => clearInterval(timer);
}
