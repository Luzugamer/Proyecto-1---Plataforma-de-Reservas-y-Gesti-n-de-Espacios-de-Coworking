import { buildApp } from './app.js';
import { ENV } from './config/env.js';
import { prisma } from './config/database.js';
import { startBackgroundJobs } from './jobs/backgroundJobs.js';

async function connectWithRetry(retries = 5, delay = 3000) {
  for (let i = 1; i <= retries; i++) {
    try {
      await prisma.$connect();
      console.log('📦 Conexión a PostgreSQL ("1° APP") establecida con éxito.');
      return;
    } catch (error) {
      console.warn(`⚠️ Intento ${i}/${retries} de conexión a Neon PostgreSQL falló. Reintentando en ${delay / 1000}s...`);
      if (i === retries) throw error;
      await new Promise((res) => setTimeout(res, delay));
    }
  }
}

async function start() {
  const app = buildApp();

  try {
    // Verificar conexión a base de datos con reintentos
    await connectWithRetry();

    const port = Number(process.env.PORT) || ENV.PORT || 4000;
    const host = '0.0.0.0';

    await app.listen({
      port,
      host,
    });

    const stopBackgroundJobs = startBackgroundJobs();
    const shutdown = async () => {
      stopBackgroundJobs();
      await app.close();
      await prisma.$disconnect();
    };
    process.once('SIGINT', () => void shutdown());
    process.once('SIGTERM', () => void shutdown());

    console.log(`🚀 Servidor Fastify corriendo en http://${host}:${port}`);
    console.log(`📡 Rutas base: http://${host}:${port}/api/v1`);
  } catch (err) {
    console.error('❌ Error fatal al iniciar el servidor:', err);
    await prisma.$disconnect();
    process.exit(1);
  }
}

start();
