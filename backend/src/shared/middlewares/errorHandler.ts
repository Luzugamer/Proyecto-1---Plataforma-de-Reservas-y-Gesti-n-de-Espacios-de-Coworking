import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors.js';
import { Prisma } from '@prisma/client';

export function errorHandler(
  error: FastifyError | AppError | ZodError | Error,
  request: FastifyRequest,
  reply: FastifyReply
) {
  // Manejo de AppError personalizado
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    });
  }

  // Manejo de errores de validación con Zod
  if (error instanceof ZodError) {
    return reply.status(400).send({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Los datos enviados no cumplen con el formato requerido.',
        details: error.flatten().fieldErrors,
      },
    });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002' && String(error.meta?.target).includes('email')) {
      return reply.status(409).send({
        error: { code: 'EMAIL_ALREADY_REGISTERED', message: 'El correo ya se encuentra registrado.', details: {} },
      });
    }
    const databaseError = JSON.stringify(error.meta ?? {});
    if ((error.code === 'P2004' || error.code === 'P2010') && databaseError.includes('reservations_no_active_overlap')) {
      return reply.status(409).send({
        error: { code: 'SLOT_UNAVAILABLE', message: 'El intervalo solicitado ya no está disponible.', details: {} },
      });
    }
  }

  // Error de validación interna de Fastify
  if ('validation' in error && error.validation) {
    return reply.status(400).send({
      error: {
        code: 'VALIDATION_ERROR',
        message: error.message || 'Error de validación en la solicitud.',
        details: error.validation,
      },
    });
  }

  // Errores no controlados (500)
  request.log.error(error);
  return reply.status(500).send({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Ocurrió un error inesperado en el servidor.',
      details: process.env.NODE_ENV === 'development' ? { rawMessage: error.message } : {},
    },
  });
}
