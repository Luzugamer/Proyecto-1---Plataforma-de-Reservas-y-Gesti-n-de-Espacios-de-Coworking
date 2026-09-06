import { FastifyInstance } from 'fastify';
import { AuthController } from './auth.controller.js';
import { authenticate } from '../../shared/middlewares/auth.middleware.js';

export async function authRoutes(fastify: FastifyInstance) {
  const controller = new AuthController();

  fastify.post('/auth/register', controller.register);
  fastify.post('/auth/login', controller.login);
  fastify.post('/auth/refresh', controller.refreshToken);
  fastify.post('/auth/logout', controller.logout);
  fastify.post('/auth/password/forgot', controller.forgotPassword);
  fastify.post('/auth/password/reset', controller.resetPassword);

  // Rutas autenticadas
  fastify.get('/auth/me', { preHandler: [authenticate] }, controller.getMe);
}
