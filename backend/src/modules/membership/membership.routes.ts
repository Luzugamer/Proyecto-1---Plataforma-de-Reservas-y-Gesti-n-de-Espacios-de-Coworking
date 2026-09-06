import { FastifyInstance } from 'fastify';
import { MembershipController } from './membership.controller.js';
import { authenticate } from '../../shared/middlewares/auth.middleware.js';

export async function membershipRoutes(fastify: FastifyInstance) {
  const controller = new MembershipController();

  fastify.get('/memberships/plans', controller.getPlans);
  fastify.get('/memberships/current', { preHandler: [authenticate] }, controller.getCurrentSubscription);
  fastify.post('/memberships/subscribe', { preHandler: [authenticate] }, controller.subscribeToPlan);
  fastify.get('/wallet/topup/packages', controller.getTopupPackages);
  fastify.post('/wallet/topup', { preHandler: [authenticate] }, controller.purchaseTopup);
  fastify.get('/wallet/transactions', { preHandler: [authenticate] }, controller.getWalletTransactions);
}
