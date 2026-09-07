import { Prisma } from '@prisma/client';

/** Serializa operaciones que puedan cambiar la ocupación de un recurso. */
export async function lockResource(tx: Prisma.TransactionClient, resourceId: string) {
  await tx.$queryRaw`SELECT true AS locked FROM pg_advisory_xact_lock(hashtextextended(${`resource:${resourceId}`}, 0))`;
}

/** Serializa movimientos que afecten al saldo o ciclo de un usuario. */
export async function lockUserWallet(tx: Prisma.TransactionClient, userId: string) {
  await tx.$queryRaw`SELECT true AS locked FROM pg_advisory_xact_lock(hashtextextended(${`wallet:${userId}`}, 0))`;
}

export async function lockHold(tx: Prisma.TransactionClient, holdId: string) {
  await tx.$queryRaw`SELECT id FROM holds WHERE id = ${holdId} FOR UPDATE`;
}

export async function lockReservation(tx: Prisma.TransactionClient, reservationId: string) {
  await tx.$queryRaw`SELECT id FROM reservations WHERE id = ${reservationId} FOR UPDATE`;
}
