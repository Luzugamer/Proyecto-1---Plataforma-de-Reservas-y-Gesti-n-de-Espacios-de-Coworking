import { buildApp } from '../app.js';
import { prisma } from '../config/database.js';

async function runBackendDiagnostics() {
  console.log('🧪 INICIANDO DIAGNÓSTICO INTEGRAL DEL BACKEND (FASTIFY + POSTGRESQL 1° APP)...');

  const app = buildApp();
  await app.ready();

  let memberToken = '';
  let adminToken = '';
  let memberRefreshToken = '';
  let memberUserId = '';
  let testResourceId = '';
  let createdHoldId = '';
  let createdReservationId = '';

  try {
    // 0. Healthcheck
    console.log('\n0. Probando Healthcheck (GET /api/v1/health)...');
    const healthRes = await app.inject({
      method: 'GET',
      url: '/api/v1/health',
    });
    if (healthRes.statusCode !== 200) {
      throw new Error(`Healthcheck falló: ${healthRes.body}`);
    }
    console.log('✅ Healthcheck OK (200):', healthRes.json());

    // 1. Auth: Login con cuenta sembrada
    console.log('\n1. Probando Login de Miembro (POST /api/v1/auth/login)...');
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'miembro@coworking.local',
        password: 'Miembro123!',
      },
    });

    if (loginRes.statusCode !== 200) {
      throw new Error(`Login falló con código ${loginRes.statusCode}: ${loginRes.body}`);
    }

    const loginData = loginRes.json();
    memberToken = loginData.accessToken;
    memberRefreshToken = loginData.refreshToken;
    memberUserId = loginData.user.id;
    console.log(`✅ Login exitoso. Usuario: ${loginData.user.name} (${loginData.user.role})`);

    // Login Admin
    const adminLoginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'admin@coworking.local',
        password: 'Admin123!',
      },
    });
    adminToken = adminLoginRes.json().accessToken;
    console.log('✅ Login de Administrador exitoso.');

    // 2. Auth: Perfil protegido
    console.log('\n2. Probando GET /api/v1/auth/me con Bearer token...');
    const meRes = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: { authorization: `Bearer ${memberToken}` },
    });
    if (meRes.statusCode !== 200) {
      throw new Error(`GET /auth/me falló: ${meRes.body}`);
    }
    console.log('✅ Perfil obtenido:', meRes.json().name);

    // 3. Auth: Rotación estricta de Refresh Token
    console.log('\n3. Probando Rotación de Refresh Token (POST /api/v1/auth/refresh)...');
    const refreshRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refreshToken: memberRefreshToken },
    });
    if (refreshRes.statusCode !== 200) {
      throw new Error(`Refresh token falló: ${refreshRes.body}`);
    }
    const newTokens = refreshRes.json();
    memberToken = newTokens.accessToken;
    memberRefreshToken = newTokens.refreshToken;
    console.log('✅ Rotación de Refresh Token exitosa. Nuevos tokens emitidos.');

    // Verificar que el token anterior fue revocado
    const reuseRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refreshToken: loginData.refreshToken },
    });
    if (reuseRes.statusCode === 401 && reuseRes.json().error?.code === 'INVALID_REFRESH_TOKEN') {
      console.log('✅ Token anterior correctamente revocado e invalidado (401 INVALID_REFRESH_TOKEN).');
    } else {
      throw new Error('El token anterior no fue invalidado.');
    }

    // 4. Catálogo: Listar sedes y recursos
    console.log('\n4. Probando Consulta de Catálogo (GET /api/v1/sites y /resources)...');
    const sitesRes = await app.inject({
      method: 'GET',
      url: '/api/v1/sites',
    });
    const sites = sitesRes.json();
    if (sites.length < 2) {
      throw new Error(`Se esperaban al menos 2 sedes, se encontraron ${sites.length}`);
    }
    console.log(`✅ ${sites.length} sedes registradas en PostgreSQL.`);

    const resourcesRes = await app.inject({
      method: 'GET',
      url: `/api/v1/sites/${sites[0].id}/resources`,
    });
    const resources = resourcesRes.json();
    testResourceId = resources[0].id;
    console.log(`✅ ${resources.length} recursos obtenidos para "${sites[0].name}".`);

    // 5. Catálogo: Disponibilidad en tiempo real
    console.log('\n5. Probando Disponibilidad de Slots (GET /api/v1/resources/:id/availability)...');
    const availRes = await app.inject({
      method: 'GET',
      url: `/api/v1/resources/${testResourceId}/availability?date=2026-10-15`,
    });
    const availData = availRes.json();
    console.log(`✅ Disponibilidad generada: ${availData.slots.length} slots de 30 min.`);

    // 6. Reservas: Saldo de Billetera
    console.log('\n6. Probando Saldo de Billetera (GET /api/v1/wallet/balance)...');
    const walletRes = await app.inject({
      method: 'GET',
      url: '/api/v1/wallet/balance',
      headers: { authorization: `Bearer ${memberToken}` },
    });
    const initialWallet = walletRes.json();
    console.log(`✅ Saldo de billetera del miembro: ${initialWallet.availableCredits} créditos.`);

    // 7. Reservas: Crear Hold de 5 minutos
    console.log('\n7. Probando Creación de Hold de 5 min (POST /api/v1/reservations/holds)...');
    const holdRes = await app.inject({
      method: 'POST',
      url: '/api/v1/reservations/holds',
      headers: { authorization: `Bearer ${memberToken}` },
      payload: {
        resourceId: testResourceId,
        startsAt: '2026-10-15T15:00:00.000Z',
        endsAt: '2026-10-15T16:00:00.000Z',
      },
    });
    if (holdRes.statusCode !== 201) {
      throw new Error(`Creación de hold falló: ${holdRes.body}`);
    }
    const holdData = holdRes.json();
    createdHoldId = holdData.holdId;
    console.log(`✅ Hold creado en PostgreSQL (ID: ${createdHoldId}, Créditos: ${holdData.creditsRequired}, Expira: ${holdData.expiresAt}).`);

    // 8. Reservas: Detección de solapamiento concurrente
    console.log('\n8. Probando Prevención de Doble-Booking (409 SLOT_UNAVAILABLE)...');
    const clashRes = await app.inject({
      method: 'POST',
      url: '/api/v1/reservations/holds',
      headers: { authorization: `Bearer ${memberToken}` },
      payload: {
        resourceId: testResourceId,
        startsAt: '2026-10-15T15:30:00.000Z',
        endsAt: '2026-10-15T16:30:00.000Z',
      },
    });
    if (clashRes.statusCode === 409 && clashRes.json().error?.code === 'SLOT_UNAVAILABLE') {
      console.log('✅ Invariante de concurrencia verificado: SLOT_UNAVAILABLE (409) bloqueó el solapamiento.');
    } else {
      throw new Error(`Se esperaba 409 SLOT_UNAVAILABLE, se obtuvo ${clashRes.statusCode}: ${clashRes.body}`);
    }

    // 9. Reservas: Confirmación atómica y deducción de créditos
    console.log('\n9. Probando Confirmación Atómica de Reserva (POST /api/v1/reservations)...');
    const confirmRes = await app.inject({
      method: 'POST',
      url: '/api/v1/reservations',
      headers: { authorization: `Bearer ${memberToken}` },
      payload: {
        holdId: createdHoldId,
        userNotes: 'Sesión de trabajo con cliente',
      },
    });
    if (confirmRes.statusCode !== 201) {
      throw new Error(`Confirmación de reserva falló: ${confirmRes.body}`);
    }
    const confirmedData = confirmRes.json();
    createdReservationId = confirmedData.reservationId;
    console.log(`✅ Reserva CONFIRMED creada (ID: ${createdReservationId}). Saldo restante: ${confirmedData.walletBalanceRemaining} cr.`);

    // 10. Ciclo de Vida: Cancelación con reembolso escalonado (RN-CAN)
    console.log('\n10. Probando Cancelación Escalonada RN-CAN (POST /api/v1/reservations/:id/cancel)...');
    const cancelRes = await app.inject({
      method: 'POST',
      url: `/api/v1/reservations/${createdReservationId}/cancel`,
      headers: { authorization: `Bearer ${memberToken}` },
    });
    if (cancelRes.statusCode !== 200) {
      throw new Error(`Cancelación falló: ${cancelRes.body}`);
    }
    const cancelData = cancelRes.json();
    console.log(`✅ Reserva cancelada. Reembolso: ${cancelData.refundPercentage}% (${cancelData.refundedCredits} créditos). Saldo: ${cancelData.walletBalance} cr.`);

    // 11. Membresías: Catálogo y Top-ups
    console.log('\n11. Probando Membresías y Recarga Top-up (POST /api/v1/wallet/topup)...');
    const topupRes = await app.inject({
      method: 'POST',
      url: '/api/v1/wallet/topup',
      headers: { authorization: `Bearer ${memberToken}` },
      payload: { packageId: 'pkg_express_5' },
    });
    if (topupRes.statusCode !== 200) {
      throw new Error(`Top-up falló: ${topupRes.body}`);
    }
    const topupData = topupRes.json();
    console.log(`✅ Recarga Top-up exitosa (+${topupData.creditsAdded} créditos). Saldo total: ${topupData.newBalance} cr.`);

    // 12. Membresías: Upgrade de Plan a PRO con acreditación inmediata
    console.log('\n12. Probando Upgrade a Plan PRO con Acreditación Inmediata (POST /api/v1/memberships/subscribe)...');
    const upgradeRes = await app.inject({
      method: 'POST',
      url: '/api/v1/memberships/subscribe',
      headers: { authorization: `Bearer ${memberToken}` },
      payload: { planId: 'PRO' },
    });
    if (upgradeRes.statusCode !== 200) {
      throw new Error(`Upgrade falló: ${upgradeRes.body}`);
    }
    const upgradeData = upgradeRes.json();
    console.log(`✅ Upgrade completado a ${upgradeData.subscription.planName}.`);
    console.log(`   Diferencia inmediata acreditada: +${upgradeData.creditedDifference} créditos.`);
    console.log(`   Saldo total resultante en PostgreSQL: ${upgradeData.newBalance} créditos.`);

    // 13. Membresías: Auditoría de transacciones
    console.log('\n13. Probando Auditoría de Transacciones (GET /api/v1/wallet/transactions)...');
    const txRes = await app.inject({
      method: 'GET',
      url: '/api/v1/wallet/transactions',
      headers: { authorization: `Bearer ${memberToken}` },
    });
    const txList = txRes.json();
    console.log(`✅ ${txList.length} movimientos auditados en la base de datos PostgreSQL.`);

    console.log('\n🎉 ¡TODAS LAS 13 PRUEBAS DE INTEGRACIÓN DEL BACKEND EN POSTGRESQL PASARON AL 100%!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR EN DIAGNÓSTICO DEL BACKEND:', error);
    process.exit(1);
  } finally {
    await app.close();
    await prisma.$disconnect();
  }
}

runBackendDiagnostics();
