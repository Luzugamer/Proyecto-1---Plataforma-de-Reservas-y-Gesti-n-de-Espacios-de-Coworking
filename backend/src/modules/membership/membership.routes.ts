import { UserRole } from '@prisma/client';
import { FastifyInstance } from 'fastify';
import { authenticate } from '../../shared/middlewares/auth.middleware.js';
import { authorizeRoles } from '../../shared/middlewares/rbac.middleware.js';
import { MembershipController } from './membership.controller.js';

export async function membershipRoutes(fastify: FastifyInstance) {
  const controller = new MembershipController();
  fastify.get('/plans', controller.getPlans);
  fastify.get('/wallet/ledger', { preHandler: [authenticate] }, controller.getWalletLedger);
  fastify.post(
    '/admin/billing/cycle-renewal',
    { preHandler: [authenticate, authorizeRoles(UserRole.SITE_ADMIN)] },
    controller.runCycleRenewal
  );
}
