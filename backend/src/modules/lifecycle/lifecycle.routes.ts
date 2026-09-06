import { FastifyInstance } from 'fastify';
import { LifecycleController } from './lifecycle.controller.js';
import { authenticate } from '../../shared/middlewares/auth.middleware.js';

export async function lifecycleRoutes(fastify: FastifyInstance) {
  const controller = new LifecycleController();

  fastify.get('/reservations', { preHandler: [authenticate] }, controller.getReservations);
  fastify.post('/reservations/:id/cancel', { preHandler: [authenticate] }, controller.cancelReservation);
  fastify.post('/reservations/:id/checkin', { preHandler: [authenticate] }, controller.checkinReservation);
}
