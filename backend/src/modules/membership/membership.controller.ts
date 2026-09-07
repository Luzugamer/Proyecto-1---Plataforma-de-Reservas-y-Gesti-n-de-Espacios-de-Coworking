import { FastifyReply, FastifyRequest } from 'fastify';
import { MembershipService } from './membership.service.js';
import { ledgerQuerySchema } from './membership.schemas.js';

const membershipService = new MembershipService();

export class MembershipController {
  async getPlans(_request: FastifyRequest, reply: FastifyReply) {
    return reply.status(200).send(await membershipService.getPlans());
  }

  async getWalletLedger(request: FastifyRequest, reply: FastifyReply) {
    const query = ledgerQuerySchema.parse(request.query);
    return reply.status(200).send(await membershipService.getWalletLedger(request.user!.userId, query));
  }

  async runCycleRenewal(_request: FastifyRequest, reply: FastifyReply) {
    return reply.status(200).send(await membershipService.renewDueMemberships());
  }
}
