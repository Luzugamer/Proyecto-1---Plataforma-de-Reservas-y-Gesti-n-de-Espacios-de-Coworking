import { FastifyReply, FastifyRequest } from 'fastify';
import { MembershipService } from './membership.service.js';
import { subscribePlanSchema, topupSchema } from './membership.schemas.js';

const membershipService = new MembershipService();

export class MembershipController {
  async getPlans(request: FastifyRequest, reply: FastifyReply) {
    const plans = await membershipService.getPlans();
    return reply.status(200).send(plans);
  }

  async getCurrentSubscription(request: FastifyRequest, reply: FastifyReply) {
    const sub = await membershipService.getCurrentSubscription(request.user!.userId);
    return reply.status(200).send(sub);
  }

  async subscribeToPlan(request: FastifyRequest, reply: FastifyReply) {
    const input = subscribePlanSchema.parse(request.body);
    const result = await membershipService.subscribeToPlan(request.user!.userId, input);
    return reply.status(200).send(result);
  }

  async getTopupPackages(request: FastifyRequest, reply: FastifyReply) {
    const packages = await membershipService.getTopupPackages();
    return reply.status(200).send(packages);
  }

  async purchaseTopup(request: FastifyRequest, reply: FastifyReply) {
    const input = topupSchema.parse(request.body);
    const result = await membershipService.purchaseTopup(request.user!.userId, input);
    return reply.status(200).send(result);
  }

  async getWalletTransactions(request: FastifyRequest, reply: FastifyReply) {
    const transactions = await membershipService.getWalletTransactions(request.user!.userId);
    return reply.status(200).send(transactions);
  }
}
