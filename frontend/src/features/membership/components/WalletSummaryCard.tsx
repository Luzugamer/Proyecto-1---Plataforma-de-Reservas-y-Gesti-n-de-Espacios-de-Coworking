import React from 'react';
import { UserSubscription } from '../types';
import { Card, CardContent } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Coins, PlusCircle, Calendar, ShieldCheck, RefreshCw } from 'lucide-react';

interface WalletSummaryCardProps {
  balance: number;
  subscription?: UserSubscription;
  onOpenTopup: () => void;
  onOpenPlans: () => void;
}

export const WalletSummaryCard: React.FC<WalletSummaryCardProps> = ({
  balance,
  subscription,
  onOpenTopup,
  onOpenPlans,
}) => {
  const renewDate = subscription?.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'Próximo ciclo';

  return (
    <Card className="overflow-hidden border-blue-200 bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 text-white shadow-lg">
      <CardContent className="p-6 md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-200 backdrop-blur-sm border border-blue-400/30">
              <ShieldCheck className="h-3.5 w-3.5 text-blue-300" />
              <span>{subscription?.planName || 'Plan Starter'} Activo</span>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-blue-200/80">
                Saldo Disponible en Billetera
              </p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-4xl md:text-5xl font-black tracking-tight text-white">
                  {balance}
                </span>
                <span className="text-lg font-semibold text-amber-400 flex items-center gap-1">
                  <Coins className="h-5 w-5" /> créditos
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-blue-200/90 pt-1">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-blue-300" />
                <span>Renovación de ciclo: <strong>{renewDate}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <RefreshCw className="h-3.5 w-3.5 text-blue-300" />
                <span>Cuota del plan: <strong>{subscription?.monthlyCredits || 10} cr/mes</strong></span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-3 shrink-0">
            <Button
              onClick={onOpenTopup}
              className="bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 shadow-md flex items-center justify-center gap-2"
            >
              <PlusCircle className="h-4 w-4" />
              Comprar Créditos Extra
            </Button>
            <Button
              variant="outline"
              onClick={onOpenPlans}
              className="border-white/30 text-white hover:bg-white/10 flex items-center justify-center gap-2"
            >
              Cambiar de Plan
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
