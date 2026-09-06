import { buildApp } from './app.js';
import { ENV } from './config/env.js';
import { prisma } from './config/database.js';

async function start() {
  const app = buildApp();

  try {
    // Verificar conexión a base de datos
    await prisma.$connect();
    console.log('📦 Conexión a PostgreSQL ("1° APP") establecida con éxito.');

    const port = Number(process.env.PORT) || ENV.PORT || 4000;
    const host = '0.0.0.0';

    await app.listen({
      port,
      host,
    });

    console.log(`🚀 Servidor Fastify corriendo en http://${host}:${port}`);
    console.log(`📡 Rutas base: http://${host}:${port}/api/v1`);
  } catch (err) {
    console.error('❌ Error al iniciar el servidor:', err);
    await prisma.$disconnect();
    process.exit(1);
  }
}

start();
