import React from 'react';
import { Alert } from '@/shared/components/ui/Alert';
import { Card, CardContent } from '@/shared/components/ui/Card';
import { Calendar, Coins } from 'lucide-react';

export const WalletSummaryCard: React.FC<{ balance: number; cycleEndsAt: string | null }> = ({
  balance,
  cycleEndsAt,
}) => {
  const remainingDays = cycleEndsAt
    ? Math.ceil((new Date(cycleEndsAt).getTime() - Date.now()) / 86_400_000)
    : null;
  return (
    <Card className="overflow-hidden border-blue-200 bg-gradient-to-br from-blue-900 to-slate-900 text-white">
      <CardContent className="space-y-4 p-6 md:p-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-blue-200">Saldo disponible</p>
        <div className="flex items-center gap-2">
          <Coins className="h-8 w-8 text-amber-400" />
          <span className="text-5xl font-black">{balance}</span>
          <span className="text-lg text-blue-100">créditos</span>
        </div>
        {cycleEndsAt && (
          <p className="flex items-center gap-2 text-sm text-blue-100">
            <Calendar className="h-4 w-4" /> El ciclo termina el {new Date(cycleEndsAt).toLocaleDateString('es-PE')}.
          </p>
        )}
        {remainingDays !== null && remainingDays >= 0 && remainingDays <= 3 && balance > 0 && (
          <Alert variant="warning">Tus {balance} créditos restantes caducarán al cerrar este ciclo.</Alert>
        )}
      </CardContent>
    </Card>
  );
};
