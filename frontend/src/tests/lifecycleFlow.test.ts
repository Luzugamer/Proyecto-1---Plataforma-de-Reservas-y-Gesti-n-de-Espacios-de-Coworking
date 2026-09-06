import { lifecycleApi } from '../features/lifecycle/api';
import { reservationsApi } from '../features/reservations/api';
import { calculateEstimatedRefund, getCheckinWindowStatus } from '../features/lifecycle/utils/refundCalculator';
import { AppApiError } from '../shared/api/errorEnvelope';

export async function runLifecycleDiagnostics() {
  const logs: string[] = [];
  const log = (msg: string) => {
    logs.push(msg);
    console.log(msg);
  };

  log('🧪 INICIANDO DIAGNÓSTICO DEL MÓDULO 003 (CICLO DE VIDA Y CHECK-IN)...');

  try {
    // 1. Validar lógica matemática pura de RN-CAN (Cancelaciones escalonadas)
    log('\n1. Probando Función Pura de Reembolso Escalonado (RN-CAN)...');
    const nowMs = new Date('2026-09-10T10:00:00Z').getTime();
    
    // > 24h antes (ej. 26h antes)
    const tMore24h = new Date('2026-09-11T12:00:00Z').toISOString();
    const refund100 = calculateEstimatedRefund(tMore24h, 4, nowMs);
    if (refund100.percentage !== 100 || refund100.refundedCredits !== 4 || refund100.tier !== 'EARLY') {
      throw new Error(`Fallo RN-CAN >24h: esperado 100%/4/EARLY, obtenido ${refund100.percentage}%/${refund100.refundedCredits}`);
    }
    log(`✅ >24h antes del inicio: Reembolso 100% (${refund100.refundedCredits} de 4 créditos) - Tier: ${refund100.tier}`);

    // Entre 2h y 24h antes (ej. 5h antes)
    const t5h = new Date('2026-09-10T15:00:00Z').toISOString();
    const refund50 = calculateEstimatedRefund(t5h, 4, nowMs);
    if (refund50.percentage !== 50 || refund50.refundedCredits !== 2 || refund50.tier !== 'LATE') {
      throw new Error(`Fallo RN-CAN 2h-24h: esperado 50%/2/LATE, obtenido ${refund50.percentage}%/${refund50.refundedCredits}`);
    }
    log(`✅ Entre 2h y 24h antes del inicio: Reembolso 50% (${refund50.refundedCredits} de 4 créditos) - Tier: ${refund50.tier}`);

    // < 2h antes (ej. 1h antes)
    const t1h = new Date('2026-09-10T11:00:00Z').toISOString();
    const refund0 = calculateEstimatedRefund(t1h, 4, nowMs);
    if (refund0.percentage !== 0 || refund0.refundedCredits !== 0 || refund0.tier !== 'CRITICAL') {
      throw new Error(`Fallo RN-CAN <2h: esperado 0%/0/CRITICAL, obtenido ${refund0.percentage}%/${refund0.refundedCredits}`);
    }
    log(`✅ Menos de 2h antes del inicio: Reembolso 0% (${refund0.refundedCredits} de 4 créditos - penalización total) - Tier: ${refund0.tier}`);

    // 2. Validar lógica matemática pura de RN-CHK (Ventana de check-in ±15m)
    log('\n2. Probando Función Pura de Ventana de Check-in (RN-CHK ±15 min)...');
    const startIso = '2026-09-10T10:00:00Z';
    
    // Exactamente 10 min antes (Dentro de ventana)
    const tMinus10m = new Date('2026-09-10T09:50:00Z').getTime();
    const statusMinus10 = getCheckinWindowStatus(startIso, tMinus10m);
    if (!statusMinus10.isWithinWindow || statusMinus10.isTooEarly || statusMinus10.isTooLate) {
      throw new Error('Fallo RN-CHK: -10 min debería estar DENTRO de la ventana');
    }

    // Exactamente 10 min después (Dentro de ventana)
    const tPlus10m = new Date('2026-09-10T10:10:00Z').getTime();
    const statusPlus10 = getCheckinWindowStatus(startIso, tPlus10m);
    if (!statusPlus10.isWithinWindow || statusPlus10.isTooEarly || statusPlus10.isTooLate) {
      throw new Error('Fallo RN-CHK: +10 min debería estar DENTRO de la ventana');
    }

    // 20 min antes (Fuera de ventana - Demasiado temprano)
    const tMinus20m = new Date('2026-09-10T09:40:00Z').getTime();
    const statusMinus20 = getCheckinWindowStatus(startIso, tMinus20m);
    if (statusMinus20.isWithinWindow || !statusMinus20.isTooEarly) {
      throw new Error('Fallo RN-CHK: -20 min debería estar FUERA de la ventana (isTooEarly = true)');
    }

    // 20 min después (Fuera de ventana - Demasiado tarde)
    const tPlus20m = new Date('2026-09-10T10:20:00Z').getTime();
    const statusPlus20 = getCheckinWindowStatus(startIso, tPlus20m);
    if (statusPlus20.isWithinWindow || !statusPlus20.isTooLate) {
      throw new Error('Fallo RN-CHK: +20 min debería estar FUERA de la ventana (isTooLate = true)');
    }
    log('✅ Regla de tolerancia de Check-in verificada (Válido solo en [-15min, +15min])');

    // 3. Consultar reservas de miembro (GET /reservations)
    log('\n3. Consultando Reservas del Miembro (GET /reservations)...');
    const reservationsData = await lifecycleApi.getReservations();
    const myReservations = reservationsData.items;
    log(`✅ Se obtuvieron ${myReservations.length} reservas en el sistema`);
    myReservations.slice(0, 3).forEach((r) => {
      log(`   - ID: ${r.id} | Espacio: ${r.resourceName} | Estado: ${r.status} | Costo: ${r.creditsDeducted} cr`);
    });

    // 4. Crear una reserva nueva y probar Cancelación con reembolso (HU-05)
    log('\n4. Creando Reserva para prueba de Cancelación y Reembolso (HU-05)...');
    // Creamos un hold a más de 24h para probar reembolso al 100%
    const holdReq = {
      resourceId: 'res_01',
      startsAt: '2026-10-01T10:00:00Z',
      endsAt: '2026-10-01T11:00:00Z',
    };
    const hold = await reservationsApi.createHold(holdReq);
    const balanceBeforeConfirm = await reservationsApi.getWalletBalance();
    log(`   Saldo antes de confirmar: ${balanceBeforeConfirm.availableCredits} créditos`);

    const confirmed = await reservationsApi.confirmReservation({
      holdId: hold.holdId,
    });
    log(`✅ Reserva creada para cancelación: ID ${confirmed.reservationId}`);
    const balanceAfterConfirm = await reservationsApi.getWalletBalance();
    log(`   Saldo tras débito: ${balanceAfterConfirm.availableCredits} créditos`);

    // Cancelar la reserva creada
    log('   Cancelando reserva...');
    const cancelResult = await lifecycleApi.cancelReservation(confirmed.reservationId);
    if (cancelResult.status === 'CANCELLED' && cancelResult.refundedCredits === 2 && cancelResult.refundPercentage === 100) {
      log(`✅ Reserva ${cancelResult.reservationId} cancelada exitosamente con reembolso de ${cancelResult.refundedCredits} créditos (${cancelResult.refundPercentage}%)`);
    } else {
      throw new Error(`Resultado de cancelación inesperado: ${JSON.stringify(cancelResult)}`);
    }

    const balanceAfterRefund = await reservationsApi.getWalletBalance();
    log(`   Saldo restituido en billetera: ${balanceAfterRefund.availableCredits} créditos`);
    if (balanceAfterRefund.availableCredits !== balanceBeforeConfirm.availableCredits) {
      throw new Error('El saldo restituido no coincide con el saldo previo');
    }

    // 5. Probar Check-in de Reserva fuera de ventana (Bloqueo 409)
    log('\n5. Probando Bloqueo de Check-in fuera de ventana (HU-06 / RN-CHK)...');
    const earlyReservation = myReservations.find((r) => r.id === 'resv_early_100');
    if (earlyReservation) {
      try {
        await lifecycleApi.checkinReservation(earlyReservation.id);
        throw new Error('Debería haber fallado con 409 CHECKIN_WINDOW_CLOSED');
      } catch (err) {
        if (err instanceof AppApiError && (err.code === 'CHECKIN_WINDOW_CLOSED' || err.status === 409)) {
          log('✅ Check-in bloqueado correctamente por anticipación (>24h): 409 CHECKIN_WINDOW_CLOSED');
        } else {
          throw err;
        }
      }
    }

    // 6. Probar Check-in de Reserva dentro de ventana (resv_checkin_ready)
    log('\n6. Probando Check-in exitoso en ventana activa (±15 min)...');
    const checkinResult = await lifecycleApi.checkinReservation('resv_checkin_ready');
    if (checkinResult.status === 'CHECKED_IN' && checkinResult.checkedInAt) {
      log(`✅ Check-in exitoso a las ${checkinResult.checkedInAt}. Estado actualizado: CHECKED_IN`);
    } else {
      throw new Error(`Check-in inválido: ${JSON.stringify(checkinResult)}`);
    }

    log('\n🎉 ¡TODAS LAS PRUEBAS DEL MÓDULO 003 PASARON SATISFACTORIAMENTE (6/6)!');
    return { success: true, logs };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log(`\n❌ ERROR EN DIAGNÓSTICO: ${errorMsg}`);
    return { success: false, logs, error: errorMsg };
  }
}
