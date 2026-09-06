import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { ENV } from './config/env.js';
import { errorHandler } from './shared/middlewares/errorHandler.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { catalogRoutes } from './modules/catalog/catalog.routes.js';
import { reservationsRoutes } from './modules/reservations/reservations.routes.js';
import { lifecycleRoutes } from './modules/lifecycle/lifecycle.routes.js';
import { membershipRoutes } from './modules/membership/membership.routes.js';

export function buildApp() {
  const app = Fastify({
    logger: false,
  });

  // Middlewares globales de seguridad
  app.register(helmet, {
    crossOriginResourcePolicy: false,
  });

  app.register(cors, {
    origin: (origin, cb) => {
      // Permitir peticiones sin header Origin (como curl, healthchecks y llamadas internas)
      if (!origin) {
        return cb(null, true);
      }
      // Permitir localhost, dominio configurado o cualquier subdominio de onrender.com
      if (
        origin === ENV.CORS_ORIGIN ||
        origin.includes('localhost') ||
        origin.includes('127.0.0.1') ||
        origin.endsWith('.onrender.com') ||
        ENV.NODE_ENV === 'development'
      ) {
        return cb(null, true);
      }
      return cb(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // Handler de errores global
  app.setErrorHandler(errorHandler);

  // Registro de rutas API v1
  app.register(
    async (apiV1) => {
      apiV1.get('/health', async () => ({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'coworking-backend-api',
      }));

      await apiV1.register(authRoutes);
      await apiV1.register(catalogRoutes);
      await apiV1.register(reservationsRoutes);
      await apiV1.register(lifecycleRoutes);
      await apiV1.register(membershipRoutes);
    },
    { prefix: '/api/v1' }
  );

  return app;
}
