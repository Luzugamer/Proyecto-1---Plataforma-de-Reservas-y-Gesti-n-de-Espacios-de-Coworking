import { FastifyReply, FastifyRequest } from 'fastify';
import { LifecycleService } from './lifecycle.service.js';
import { reservationsQuerySchema } from './lifecycle.schemas.js';

const lifecycleService = new LifecycleService();

export class LifecycleController {
  async getReservations(request: FastifyRequest, reply: FastifyReply) {
    const query = reservationsQuerySchema.parse(request.query);

    const result = await lifecycleService.getReservations(
      request.user!.userId,
      request.user!.role,
      query
    );
    return reply.status(200).send(result);
  }

  async cancelReservation(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const result = await lifecycleService.cancelReservation(
      request.user!.userId,
      request.user!.role,
      id
    );
    return reply.status(200).send(result);
  }

  async checkinReservation(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const result = await lifecycleService.checkinReservation(
      request.user!.userId,
      request.user!.role,
      id
    );
    return reply.status(200).send(result);
  }
}
