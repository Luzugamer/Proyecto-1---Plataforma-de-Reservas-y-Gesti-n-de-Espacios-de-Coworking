import { FastifyReply, FastifyRequest } from 'fastify';
import { UserRole } from '@prisma/client';
import { AppError } from '../utils/errors.js';

export function authorizeRoles(...allowedRoles: UserRole[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      throw new AppError('UNAUTHORIZED', 'Usuario no autenticado.', 401);
    }

    if (!allowedRoles.includes(request.user.role)) {
      throw new AppError(
        'FORBIDDEN',
        `Acceso denegado. Se requiere uno de los siguientes roles: ${allowedRoles.join(', ')}.`,
        403
      );
    }
  };
}
