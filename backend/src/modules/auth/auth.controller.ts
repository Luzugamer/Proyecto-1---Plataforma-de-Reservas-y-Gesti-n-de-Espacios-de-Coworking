import { FastifyReply, FastifyRequest } from 'fastify';
import { AuthService } from './auth.service.js';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './auth.schemas.js';

const authService = new AuthService();

export class AuthController {
  async register(request: FastifyRequest, reply: FastifyReply) {
    const input = registerSchema.parse(request.body);
    const result = await authService.register(input);
    return reply.status(201).send(result);
  }

  async login(request: FastifyRequest, reply: FastifyReply) {
    const input = loginSchema.parse(request.body);
    const result = await authService.login(input);
    return reply.status(200).send(result);
  }

  async refreshToken(request: FastifyRequest, reply: FastifyReply) {
    const input = refreshTokenSchema.parse(request.body);
    const result = await authService.refreshToken(input);
    return reply.status(200).send(result);
  }

  async logout(request: FastifyRequest, reply: FastifyReply) {
    const input = refreshTokenSchema.parse(request.body);
    await authService.logout(input);
    return reply.status(204).send();
  }

  async getMe(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) {
      return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'No autenticado.' } });
    }
    const result = await authService.getMe(request.user.userId);
    return reply.status(200).send(result);
  }

  async forgotPassword(request: FastifyRequest, reply: FastifyReply) {
    const input = forgotPasswordSchema.parse(request.body);
    const result = await authService.forgotPassword(input);
    return reply.status(202).send(result);
  }

  async resetPassword(request: FastifyRequest, reply: FastifyReply) {
    const input = resetPasswordSchema.parse(request.body);
    const result = await authService.resetPassword(input);
    return reply.status(200).send(result);
  }
}
