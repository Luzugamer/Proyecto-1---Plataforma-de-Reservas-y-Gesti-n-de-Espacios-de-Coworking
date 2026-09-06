import { FastifyReply, FastifyRequest } from 'fastify';
import { LifecycleService } from './lifecycle.service.js';

const lifecycleService = new LifecycleService();

export class LifecycleController {
  async getReservations(request: FastifyRequest, reply: FastifyReply) {
    const query = request.query as {
      status?: string;
      page?: string;
      pageSize?: string;
    };

    const result = await lifecycleService.getReservations(
      request.user!.userId,
      request.user!.role,
      {
        status: query.status,
        page: query.page ? Number(query.page) : undefined,
        pageSize: query.pageSize ? Number(query.pageSize) : undefined,
      }
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
