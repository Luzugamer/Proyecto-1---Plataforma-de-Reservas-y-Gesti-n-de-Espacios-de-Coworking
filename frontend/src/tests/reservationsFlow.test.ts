import { reservationsApi } from '../features/reservations/api';
import { AppApiError } from '../shared/api/errorEnvelope';

export async function runReservationsDiagnostics() {
  const logs: string[] = [];
  const log = (msg: string) => {
    logs.push(msg);
    console.log(msg);
  };

  log('🧪 INICIANDO DIAGNÓSTICO DEL MÓDULO 002 (RESERVA Y CONCURRENCIA)...');

  try {
    // 1. Consultar balance inicial de la billetera (GET /wallet/balance)
    log('\n1. Probando Consulta de Balance de Billetera (GET /wallet/balance)...');
    const initialBalance = await reservationsApi.getWalletBalance();
    log(`✅ Saldo inicial obtenido: ${initialBalance.availableCredits} créditos (Usuario: ${initialBalance.userId})`);

    // 2. Crear retención temporal de 5 min (POST /reservations/holds)
    log('\n2. Probando Creación de Hold de 5 minutos (HU-04 / POST /reservations/holds)...');
    const testHoldReq = {
      resourceId: 'res_01',
      startsAt: '2026-09-15T16:00:00Z',
      endsAt: '2026-09-15T17:00:00Z',
    };

    const hold1 = await reservationsApi.createHold(testHoldReq);
    if (hold1.holdId && hold1.expiresAt && hold1.creditsRequired === 2) {
      log(`✅ Hold creado exitosamente (ID: ${hold1.holdId})`);
      log(`   Créditos requeridos: ${hold1.creditsRequired}`);
      log(`   Expiración configurada: ${hold1.expiresAt} (TTL 300s)`);
    } else {
      throw new Error(`Hold inválido: ${JSON.stringify(hold1)}`);
    }

    // 3. Intento de solapamiento concurrente (SLOT_UNAVAILABLE / 409)
    log('\n3. Probando detección de solapamiento concurrente (409 SLOT_UNAVAILABLE)...');
    try {
      await reservationsApi.createHold({
        resourceId: 'res_01',
        startsAt: '2026-09-15T16:30:00Z',
        endsAt: '2026-09-15T17:30:00Z',
      });
      throw new Error('Debería haber fallado por solapamiento con el hold activo');
    } catch (err) {
      if (err instanceof AppApiError && err.code === 'SLOT_UNAVAILABLE') {
        log('✅ Invariante de concurrencia verificado: SLOT_UNAVAILABLE (409) bloqueó el double-booking');
      } else {
        throw err;
      }
    }

    // 4. Liberación manual de hold (DELETE /reservations/holds/:id)
    log('\n4. Probando Liberación manual de Hold (DELETE /reservations/holds/:id)...');
    await reservationsApi.releaseHold(hold1.holdId);
    log('✅ Hold liberado exitosamente (204 No Content)');

    // 5. Crear nuevo hold para el flujo de confirmación con créditos
    log('\n5. Creando nuevo Hold para confirmación de reserva (HU-03)...');
    const hold2 = await reservationsApi.createHold(testHoldReq);
    log(`✅ Nuevo Hold creado: ${hold2.holdId}`);

    // 6. Confirmación de reserva y deducción de créditos (POST /reservations)
    log('\n6. Probando Confirmación atómica de Reserva (POST /reservations)...');
    const reservationRes = await reservationsApi.confirmReservation({ holdId: hold2.holdId });

    if (
      reservationRes.reservationId &&
      reservationRes.status === 'CONFIRMED' &&
      reservationRes.creditsDeducted === hold2.creditsRequired
    ) {
      log(`✅ Reserva CONFIRMED creada: ID ${reservationRes.reservationId}`);
      log(`   Créditos descontados: ${reservationRes.creditsDeducted}`);
    } else {
      throw new Error(`Confirmación inválida: ${JSON.stringify(reservationRes)}`);
    }

    // 7. Verificar nuevo balance de billetera
    log('\n7. Verificando actualización del saldo en la billetera...');
    const updatedBalance = await reservationsApi.getWalletBalance();
    const expectedCredits = initialBalance.availableCredits - reservationRes.creditsDeducted;

    if (updatedBalance.availableCredits === expectedCredits) {
      log(`✅ Saldo actualizado correctamente: ${updatedBalance.availableCredits} créditos restantes`);
    } else {
      throw new Error(
        `Saldo inconsistente. Esperado: ${expectedCredits}, Actual: ${updatedBalance.availableCredits}`
      );
    }

    // 8. Intento de reusar un hold ya consumido (404 HOLD_NOT_FOUND)
    log('\n8. Probando rechazo de hold ya consumido (404 HOLD_NOT_FOUND)...');
    try {
      await reservationsApi.confirmReservation({ holdId: hold2.holdId });
      throw new Error('El hold consumido no debe poder confirmarse dos veces');
    } catch (err) {
      if (err instanceof AppApiError && err.code === 'HOLD_NOT_FOUND') {
        log('✅ Integridad verificada: El hold consumido ya no existe');
      } else {
        throw err;
      }
    }

    log('\n🎉 TODOS LOS CRITERIOS DE ACEPTACIÓN DEL MÓDULO 002 (RESERVA Y CONCURRENCIA) PASARON AL 100%.');
    return { success: true, logs };
  } catch (err) {
    log(`❌ Error durante el diagnóstico de reservas: ${err instanceof Error ? err.message : String(err)}`);
    return { success: false, logs, error: err };
  }
}
