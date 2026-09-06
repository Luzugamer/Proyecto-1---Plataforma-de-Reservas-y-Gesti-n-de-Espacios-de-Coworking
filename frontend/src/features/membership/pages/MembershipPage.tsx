import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useWalletBalance } from '@/features/reservations/hooks/useWalletBalance';
import { useMembershipPlans } from '../hooks/useMembershipPlans';
import { useCurrentSubscription } from '../hooks/useCurrentSubscription';
import { useWalletTransactions } from '../hooks/useWalletTransactions';
import { MembershipPlan } from '../types';
import { WalletSummaryCard } from '../components/WalletSummaryCard';
import { PlanCard } from '../components/PlanCard';
import { TransactionHistoryTable } from '../components/TransactionHistoryTable';
import { TopupModal } from '../components/TopupModal';
import { ChangePlanModal } from '../components/ChangePlanModal';
import { CreditsBalanceBadge } from '@/features/reservations/components/CreditsBalanceBadge';
import { UserMenu } from '@/features/auth/components/UserMenu';
import { ArrowLeft, Layers } from 'lucide-react';

export const MembershipPage: React.FC = () => {
  const { data: wallet } = useWalletBalance();
  const { data: plans = [], isLoading: loadingPlans } = useMembershipPlans();
  const { data: subscription } = useCurrentSubscription();
  const { data: transactions = [], isLoading: loadingTx } = useWalletTransactions();

  const [isTopupOpen, setIsTopupOpen] = useState(false);
  const [selectedPlanForChange, setSelectedPlanForChange] = useState<MembershipPlan | null>(null);

  const availableBalance = wallet?.availableCredits ?? 10;

  const scrollToPlans = () => {
    document.getElementById('plans-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white px-6 py-3 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              title="Volver al Dashboard"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white font-bold">
                C
              </div>
              <span className="text-xl font-black text-slate-900">
                COWORK<span className="text-blue-600">HUB</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <CreditsBalanceBadge />
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl flex-1 p-6 w-full space-y-8">
        {/* Título de Sección */}
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Membresía y Billetera de Créditos
          </h1>
          <p className="text-sm text-slate-600">
            Administra tu plan mensual de coworking, adquiere créditos adicionales y audita cada movimiento de tu saldo.
          </p>
        </div>

        {/* Tarjeta de Resumen de Billetera */}
        <WalletSummaryCard
          balance={availableBalance}
          subscription={subscription}
          onOpenTopup={() => setIsTopupOpen(true)}
          onOpenPlans={scrollToPlans}
        />

        {/* Sección de Planes de Membresía */}
        <section id="plans-section" className="space-y-4 pt-2">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-bold text-slate-900">
              Planes de Membresía Disponibles
            </h2>
          </div>

          {loadingPlans ? (
            <div className="py-8 text-center text-sm text-slate-500">
              Cargando catálogo de planes...
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-3">
              {plans.map((plan: MembershipPlan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  currentPlanId={subscription?.planId}
                  onSelectPlan={(p) => setSelectedPlanForChange(p)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Historial de Transacciones */}
        <section className="space-y-4 pt-2">
          <TransactionHistoryTable
            transactions={transactions}
            isLoading={loadingTx}
          />
        </section>
      </main>

      {/* Modales */}
      <TopupModal
        isOpen={isTopupOpen}
        onClose={() => setIsTopupOpen(false)}
      />

      <ChangePlanModal
        selectedPlan={selectedPlanForChange}
        currentSubscription={subscription}
        onClose={() => setSelectedPlanForChange(null)}
      />
    </div>
  );
};
