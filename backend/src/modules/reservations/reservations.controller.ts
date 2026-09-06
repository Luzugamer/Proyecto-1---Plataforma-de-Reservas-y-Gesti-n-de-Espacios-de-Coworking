import { FastifyReply, FastifyRequest } from 'fastify';
import { ReservationsService } from './reservations.service.js';
import { createHoldSchema, confirmReservationSchema } from './reservations.schemas.js';

const reservationsService = new ReservationsService();

export class ReservationsController {
  async getWalletBalance(request: FastifyRequest, reply: FastifyReply) {
    const result = await reservationsService.getWalletBalance(request.user!.userId);
    return reply.status(200).send(result);
  }

  async createHold(request: FastifyRequest, reply: FastifyReply) {
    const input = createHoldSchema.parse(request.body);
    const result = await reservationsService.createHold(request.user!.userId, input);
    return reply.status(201).send(result);
  }

  async releaseHold(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    await reservationsService.releaseHold(request.user!.userId, id);
    return reply.status(204).send();
  }

  async confirmReservation(request: FastifyRequest, reply: FastifyReply) {
    const input = confirmReservationSchema.parse(request.body);
    const result = await reservationsService.confirmReservation(
      request.user!.userId,
      input
    );
    return reply.status(201).send(result);
  }
}
