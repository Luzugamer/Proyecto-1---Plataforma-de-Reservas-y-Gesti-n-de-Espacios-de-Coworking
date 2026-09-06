import { FastifyInstance } from 'fastify';
import { ReservationsController } from './reservations.controller.js';
import { authenticate } from '../../shared/middlewares/auth.middleware.js';

export async function reservationsRoutes(fastify: FastifyInstance) {
  const controller = new ReservationsController();

  fastify.get('/wallet/balance', { preHandler: [authenticate] }, controller.getWalletBalance);
  fastify.post('/reservations/holds', { preHandler: [authenticate] }, controller.createHold);
  fastify.delete('/reservations/holds/:id', { preHandler: [authenticate] }, controller.releaseHold);
  fastify.post('/reservations', { preHandler: [authenticate] }, controller.confirmReservation);
}
