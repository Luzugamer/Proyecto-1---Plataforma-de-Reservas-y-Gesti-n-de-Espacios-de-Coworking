import React, { useState } from 'react';
import { WalletTransaction, TransactionType } from '../types';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/Card';
import {
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Sparkles,
  ShieldAlert,
  Coins,
  Receipt,
  ListFilter,
} from 'lucide-react';
import { cn } from '@/shared/utils/cn';

interface TransactionHistoryTableProps {
  transactions: WalletTransaction[];
  isLoading: boolean;
}

type FilterTab = 'ALL' | 'CHARGES' | 'REFUNDS' | 'TOPUPS';

export const TransactionHistoryTable: React.FC<TransactionHistoryTableProps> = ({
  transactions,
  isLoading,
}) => {
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');

  const filteredTransactions = transactions.filter((tx) => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'CHARGES') return tx.type === 'RESERVATION_CHARGE';
    if (activeTab === 'REFUNDS') return tx.type === 'CANCELLATION_REFUND';
    if (activeTab === 'TOPUPS')
      return (
        tx.type === 'TOPUP_PURCHASE' ||
        tx.type === 'MONTHLY_ALLOWANCE' ||
        tx.type === 'PLAN_UPGRADE_CREDIT'
      );
    return true;
  });

  const renderIcon = (type: TransactionType) => {
    switch (type) {
      case 'RESERVATION_CHARGE':
        return <ArrowDownLeft className="h-4 w-4 text-rose-600" />;
      case 'CANCELLATION_REFUND':
        return <ArrowUpRight className="h-4 w-4 text-emerald-600" />;
      case 'TOPUP_PURCHASE':
        return <Coins className="h-4 w-4 text-amber-600" />;
      case 'PLAN_UPGRADE_CREDIT':
        return <Sparkles className="h-4 w-4 text-blue-600" />;
      case 'MONTHLY_ALLOWANCE':
        return <RefreshCw className="h-4 w-4 text-indigo-600" />;
      default:
        return <ShieldAlert className="h-4 w-4 text-slate-500" />;
    }
  };

  const getBadgeLabel = (type: TransactionType) => {
    switch (type) {
      case 'RESERVATION_CHARGE':
        return { label: 'Cargo Reserva', className: 'bg-rose-50 text-rose-700 border-rose-200' };
      case 'CANCELLATION_REFUND':
        return { label: 'Reembolso', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'TOPUP_PURCHASE':
        return { label: 'Recarga Top-up', className: 'bg-amber-50 text-amber-800 border-amber-200' };
      case 'PLAN_UPGRADE_CREDIT':
        return { label: 'Upgrade Plan', className: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'MONTHLY_ALLOWANCE':
        return { label: 'Cuota Mensual', className: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
      default:
        return { label: 'Ajuste', className: 'bg-slate-50 text-slate-700 border-slate-200' };
    }
  };

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="border-b border-slate-100 pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-base font-bold text-slate-900">
              Historial de Movimientos de Billetera
            </CardTitle>
          </div>

          {/* Filtro por pestañas */}
          <div className="flex items-center rounded-lg bg-slate-100 p-1 text-xs font-semibold text-slate-600">
            <button
              onClick={() => setActiveTab('ALL')}
              className={cn(
                'rounded-md px-3 py-1 transition-all',
                activeTab === 'ALL'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'hover:text-slate-900'
              )}
            >
              Todos ({transactions.length})
            </button>
            <button
              onClick={() => setActiveTab('CHARGES')}
              className={cn(
                'rounded-md px-3 py-1 transition-all',
                activeTab === 'CHARGES'
                  ? 'bg-white text-rose-700 shadow-sm'
                  : 'hover:text-slate-900'
              )}
            >
              Cargos
            </button>
            <button
              onClick={() => setActiveTab('REFUNDS')}
              className={cn(
                'rounded-md px-3 py-1 transition-all',
                activeTab === 'REFUNDS'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'hover:text-slate-900'
              )}
            >
              Reembolsos
            </button>
            <button
              onClick={() => setActiveTab('TOPUPS')}
              className={cn(
                'rounded-md px-3 py-1 transition-all',
                activeTab === 'TOPUPS'
                  ? 'bg-white text-amber-800 shadow-sm'
                  : 'hover:text-slate-900'
              )}
            >
              Recargas / Planes
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex items-center justify-center p-8 text-sm text-slate-500">
            Cargando historial de transacciones...
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-slate-500">
            <ListFilter className="h-8 w-8 text-slate-300 mb-2" />
            <p className="text-sm font-medium">No hay movimientos en esta categoría.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Tipo / Motivo</th>
                  <th className="px-4 py-3">Fecha y Hora</th>
                  <th className="px-4 py-3 text-right">Monto (Créditos)</th>
                  <th className="px-4 py-3 text-right">Balance Resultante</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransactions.map((tx) => {
                  const badge = getBadgeLabel(tx.type);
                  const isPositive = tx.amount > 0;
                  const dateFormatted = new Date(tx.createdAt).toLocaleString('es-ES', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex items-start gap-2.5">
                          <div className="rounded-lg bg-slate-100 p-1.5 shrink-0 mt-0.5">
                            {renderIcon(tx.type)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  'inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold border',
                                  badge.className
                                )}
                              >
                                {badge.label}
                              </span>
                            </div>
                            <p className="mt-1 font-medium text-slate-900">{tx.description}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 whitespace-nowrap">
                        {dateFormatted}
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <span
                          className={cn(
                            'text-sm font-bold',
                            isPositive ? 'text-emerald-600' : 'text-rose-600'
                          )}
                        >
                          {isPositive ? `+${tx.amount}` : tx.amount} cr
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-semibold text-slate-700 whitespace-nowrap">
                        {tx.balanceAfter} cr
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
