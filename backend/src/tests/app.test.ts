import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp } from '../app.js';

test('expone el healthcheck requerido por Render', async () => {
  const app = buildApp();
  const response = await app.inject({ method: 'GET', url: '/api/v1/health' });
  assert.equal(response.statusCode, 200);
  assert.equal(response.json().status, 'ok');
  await app.close();
});

test('rechaza una ruta protegida sin Bearer token', async () => {
  const app = buildApp();
  const response = await app.inject({ method: 'GET', url: '/api/v1/wallet/balance' });
  assert.equal(response.statusCode, 401);
  assert.equal(response.json().error.code, 'UNAUTHORIZED');
  await app.close();
});
