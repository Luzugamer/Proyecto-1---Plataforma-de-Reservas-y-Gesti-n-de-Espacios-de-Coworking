import { setupServer } from 'msw/node';
import { authHandlers } from '../mocks/handlers/auth.handlers';
import { runAuthDiagnostics } from './authFlow.test';

const server = setupServer(...authHandlers);

async function main() {
  server.listen({ onUnhandledRequest: 'bypass' });
  console.log('Servidor MSW Node iniciado.');

  const result = await runAuthDiagnostics();
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
