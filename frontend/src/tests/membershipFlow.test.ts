import { membershipApi } from '../features/membership/api';
import { reservationsApi } from '../features/reservations/api';

export async function runMembershipDiagnostics() {
  const logs: string[] = [];
  const log = (msg: string) => {
    logs.push(msg);
    console.log(msg);
  };

  log('🧪 INICIANDO DIAGNÓSTICO DEL MÓDULO 004 (MEMBRESÍAS, BILLETERA Y CRÉDITOS)...');

  try {
    // 1. Consultar catálogo de planes
    log('\n1. Consultando Catálogo de Planes de Membresía (GET /memberships/plans)...');
    const plans = await membershipApi.getPlans();
    if (plans.length !== 3) {
      throw new Error(`Se esperaban 3 planes, se obtuvieron ${plans.length}`);
    }
    plans.forEach((p) => {
      log(`   - [${p.id}] ${p.name}: ${p.monthlyCredits} créditos/mes ($${p.pricePerMonth} ${p.currency})`);
    });
    log('✅ Planes de membresía obtenidos y validados correctamente.');

    // 2. Consultar suscripción activa inicial
    log('\n2. Consultando Suscripción Actual del Miembro (GET /memberships/current)...');
    const sub = await membershipApi.getCurrentSubscription();
    if (sub.planId !== 'STARTER' || sub.status !== 'ACTIVE') {
      throw new Error(`Suscripción inicial inesperada: ${JSON.stringify(sub)}`);
    }
    log(`✅ Suscripción activa verificada: ${sub.planName} (${sub.monthlyCredits} cr/mes)`);

    // 3. Consultar paquetes de recarga adicionales
    log('\n3. Consultando Paquetes de Recarga Extra / Top-ups (GET /wallet/topup/packages)...');
    const packages = await membershipApi.getTopupPackages();
    if (packages.length !== 3) {
      throw new Error(`Se esperaban 3 paquetes top-up, se obtuvieron ${packages.length}`);
    }
    packages.forEach((pkg) => {
      log(`   - [${pkg.id}] ${pkg.label}: +${pkg.credits} cr ($${pkg.price})`);
    });
    log('✅ Catálogo de paquetes Top-up verificado.');

    // 4. Probar compra de recarga Top-up (+5 créditos)
    log('\n4. Probando Compra de Paquete Top-up Express (+5 créditos / POST /wallet/topup)...');
    const balanceBeforeTopup = await reservationsApi.getWalletBalance();
    log(`   Saldo previo a la recarga: ${balanceBeforeTopup.availableCredits} créditos`);

    const topupRes = await membershipApi.purchaseTopup({ packageId: 'pkg_express_5' });
    if (topupRes.creditsAdded !== 5 || topupRes.newBalance !== balanceBeforeTopup.availableCredits + 5) {
      throw new Error(`Resultado de recarga inesperado: ${JSON.stringify(topupRes)}`);
    }
    log(`✅ Recarga exitosa (+${topupRes.creditsAdded} créditos). Nuevo saldo: ${topupRes.newBalance} créditos`);

    const balanceAfterTopup = await reservationsApi.getWalletBalance();
    if (balanceAfterTopup.availableCredits !== topupRes.newBalance) {
      throw new Error('El saldo de billetera no coincide tras la recarga');
    }

    // 5. Probar Upgrade de Plan (STARTER -> PRO con acreditación inmediata de diferencia)
    log('\n5. Probando Upgrade de Membresía a Plan PRO (RN-MEM / POST /memberships/subscribe)...');
    const subRes = await membershipApi.subscribeToPlan({ planId: 'PRO' });
    if (subRes.subscription.planId !== 'PRO' || subRes.creditedDifference !== 20) {
      throw new Error(`Upgrade fallido o diferencia incorrecta: ${JSON.stringify(subRes)}`);
    }
    log(`✅ Upgrade a ${subRes.subscription.planName} completado.`);
    log(`   Créditos de diferencia otorgados de inmediato: +${subRes.creditedDifference} créditos.`);
    log(`   Nuevo saldo total en billetera: ${subRes.newBalance} créditos.`);

    // 6. Consultar auditoría e historial de transacciones
    log('\n6. Consultando Historial de Transacciones de Billetera (GET /wallet/transactions)...');
    const transactions = await membershipApi.getTransactions();
    log(`✅ Se encontraron ${transactions.length} transacciones registradas.`);
    
    const hasTopupTx = transactions.some((tx) => tx.type === 'TOPUP_PURCHASE');
    const hasUpgradeTx = transactions.some((tx) => tx.type === 'PLAN_UPGRADE_CREDIT');
    const hasAllowanceTx = transactions.some((tx) => tx.type === 'MONTHLY_ALLOWANCE');

    if (!hasTopupTx || !hasUpgradeTx || !hasAllowanceTx) {
      throw new Error('Faltan tipos de transacciones esperadas en la auditoría.');
    }

    transactions.forEach((tx) => {
      log(`   - [${tx.type}] ${tx.description} -> Monto: ${tx.amount > 0 ? '+' : ''}${tx.amount} cr (Saldo resultante: ${tx.balanceAfter} cr)`);
    });

    log('\n🎉 ¡TODAS LAS PRUEBAS DEL MÓDULO 004 PASARON SATISFACTORIAMENTE (6/6)!');
    return { success: true, logs };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log(`\n❌ ERROR EN DIAGNÓSTICO: ${errorMsg}`);
    return { success: false, logs, error: errorMsg };
  }
}
