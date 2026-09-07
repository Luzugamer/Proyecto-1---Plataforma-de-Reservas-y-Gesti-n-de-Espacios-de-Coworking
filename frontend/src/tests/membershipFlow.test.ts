import { membershipApi } from '../features/membership/api';

export async function runMembershipDiagnostics() {
  const logs: string[] = [];
  try {
    const plans = await membershipApi.getPlans();
    if (!plans.length) throw new Error('El catálogo de planes está vacío.');
    const ledger = await membershipApi.getLedger({ page: 1, pageSize: 20 });
    if (!Array.isArray(ledger.items)) throw new Error('El ledger no devolvió una página válida.');
    logs.push(`Planes: ${plans.length}`, `Movimientos: ${ledger.total}`);
    return { success: true, logs };
  } catch (error) {
    return { success: false, logs, error: error instanceof Error ? error.message : String(error) };
  }
}
