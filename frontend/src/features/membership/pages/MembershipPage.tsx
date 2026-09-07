import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { UserMenu } from '@/features/auth/components/UserMenu';
import { useWalletBalance } from '@/features/reservations/hooks/useWalletBalance';
import { useMembershipPlans } from '../hooks/useMembershipPlans';
import { useWalletTransactions } from '../hooks/useWalletTransactions';
import { PlanCard } from '../components/PlanCard';
import { TransactionHistoryTable } from '../components/TransactionHistoryTable';
import { WalletSummaryCard } from '../components/WalletSummaryCard';

export const MembershipPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const { data: wallet } = useWalletBalance();
  const { data: plans = [], isLoading: loadingPlans } = useMembershipPlans();
  const { data: ledger, isLoading: loadingLedger } = useWalletTransactions(page);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white px-6 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2 text-sm text-slate-600"><ArrowLeft className="h-4 w-4" /> Dashboard</Link>
          <UserMenu />
        </div>
      </header>
      <main className="mx-auto max-w-7xl space-y-8 p-6">
        <div><h1 className="text-2xl font-black text-slate-900">Membresía y créditos</h1><p className="text-sm text-slate-600">Consulta el saldo, la caducidad y cada movimiento auditable.</p></div>
        <WalletSummaryCard balance={wallet?.availableCredits ?? 0} cycleEndsAt={wallet?.cycleEndsAt ?? null} />
        <section className="space-y-4"><h2 className="text-lg font-bold">Planes disponibles</h2>{loadingPlans ? <p>Cargando planes…</p> : <div className="grid gap-5 md:grid-cols-3">{plans.map((plan) => <PlanCard key={plan.id} plan={plan} />)}</div>}</section>
        <TransactionHistoryTable transactions={ledger?.items ?? []} isLoading={loadingLedger} />
        <div className="flex items-center justify-end gap-3 text-sm">
          <button className="rounded border px-3 py-1 disabled:opacity-40" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Anterior</button>
          <span>Página {page}</span>
          <button className="rounded border px-3 py-1 disabled:opacity-40" disabled={!ledger || page * ledger.pageSize >= ledger.total} onClick={() => setPage((value) => value + 1)}>Siguiente</button>
        </div>
      </main>
    </div>
  );
};
