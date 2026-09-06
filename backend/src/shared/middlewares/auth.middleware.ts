import { FastifyReply, FastifyRequest } from 'fastify';
import { verifyAccessToken, JwtUserPayload } from '../utils/jwt.js';
import { AppError } from '../utils/errors.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: JwtUserPayload;
  }
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError('UNAUTHORIZED', 'Token de acceso no proporcionado o formato inválido.', 401);
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = verifyAccessToken(token);
    request.user = payload;
  } catch {
    throw new AppError('UNAUTHORIZED', 'Token de acceso inválido o expirado.', 401);
  }
}
