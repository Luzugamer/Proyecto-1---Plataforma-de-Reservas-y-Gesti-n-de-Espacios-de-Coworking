import { setupWorker } from 'msw/browser';
import { authHandlers } from './handlers/auth.handlers';
import { catalogHandlers } from './handlers/catalog.handlers';
import { reservationsHandlers } from './handlers/reservations.handlers';
import { lifecycleHandlers } from './handlers/lifecycle.handlers';
import { membershipHandlers } from './handlers/membership.handlers';

export const worker = setupWorker(
  ...authHandlers,
  ...catalogHandlers,
  ...reservationsHandlers,
  ...lifecycleHandlers,
  ...membershipHandlers
);

