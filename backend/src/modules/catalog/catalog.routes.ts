import { FastifyInstance } from 'fastify';
import { CatalogController } from './catalog.controller.js';
import { authenticate } from '../../shared/middlewares/auth.middleware.js';
import { authorizeRoles } from '../../shared/middlewares/rbac.middleware.js';
import { UserRole } from '@prisma/client';

export async function catalogRoutes(fastify: FastifyInstance) {
  const controller = new CatalogController();

  // Rutas públicas de catálogo
  fastify.get('/sites', controller.getSites);
  fastify.get('/sites/:siteId/resources', controller.getResourcesBySite);
  fastify.get('/resources/:id', controller.getResourceById);
  fastify.get('/resources/:id/availability', controller.getAvailability);

  // Ruta administrativa de bloqueo por mantenimiento (HU-02)
  fastify.post(
    '/admin/resources/:id/blocks',
    {
      preHandler: [authenticate, authorizeRoles(UserRole.SITE_ADMIN, UserRole.RECEPTIONIST)],
    },
    controller.createMaintenanceBlock
  );
}
