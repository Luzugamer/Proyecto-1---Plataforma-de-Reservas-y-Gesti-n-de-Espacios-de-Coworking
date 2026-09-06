import { setupServer } from 'msw/node';
import { authHandlers } from '../mocks/handlers/auth.handlers';
import { catalogHandlers } from '../mocks/handlers/catalog.handlers';
import { reservationsHandlers } from '../mocks/handlers/reservations.handlers';
import { runReservationsDiagnostics } from './reservationsFlow.test';

const server = setupServer(...authHandlers, ...catalogHandlers, ...reservationsHandlers);

async function main() {
  server.listen({ onUnhandledRequest: 'bypass' });
  console.log('Servidor MSW Node iniciado para diagnóstico de Reservas y Concurrencia.');

  const result = await runReservationsDiagnostics();
  server.close();

  if (!result.success) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Error fatal:', err);
  process.exit(1);
});
