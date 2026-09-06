import { setupServer } from 'msw/node';
import { authHandlers } from '../mocks/handlers/auth.handlers';
import { catalogHandlers } from '../mocks/handlers/catalog.handlers';
import { reservationsHandlers } from '../mocks/handlers/reservations.handlers';
import { lifecycleHandlers } from '../mocks/handlers/lifecycle.handlers';
import { membershipHandlers } from '../mocks/handlers/membership.handlers';
import { runMembershipDiagnostics } from './membershipFlow.test';

const server = setupServer(
  ...authHandlers,
  ...catalogHandlers,
  ...reservationsHandlers,
  ...lifecycleHandlers,
  ...membershipHandlers
);

async function main() {
  server.listen({ onUnhandledRequest: 'bypass' });
  console.log('Servidor MSW Node iniciado para diagnóstico de Membresías y Billetera.');

  const result = await runMembershipDiagnostics();
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
