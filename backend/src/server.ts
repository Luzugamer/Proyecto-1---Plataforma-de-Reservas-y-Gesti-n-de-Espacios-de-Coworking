import { buildApp } from './app.js';
import { ENV } from './config/env.js';
import { prisma } from './config/database.js';

async function start() {
  const app = buildApp();

  try {
    // Verificar conexión a base de datos
    await prisma.$connect();
    console.log('📦 Conexión a PostgreSQL ("1° APP") establecida con éxito.');

    await app.listen({
      port: ENV.PORT,
      host: ENV.HOST,
    });

    console.log(`🚀 Servidor Fastify corriendo en http://${ENV.HOST}:${ENV.PORT}`);
    console.log(`📡 Rutas base: http://localhost:${ENV.PORT}/api/v1`);
  } catch (err) {
    console.error('❌ Error al iniciar el servidor:', err);
    await prisma.$disconnect();
    process.exit(1);
  }
}

start();
