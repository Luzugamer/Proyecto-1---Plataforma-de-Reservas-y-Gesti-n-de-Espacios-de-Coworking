import React from 'react';
import { Link } from 'react-router-dom';
import { WalletTransaction } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/Card';

const labels: Record<WalletTransaction['type'], string> = {
  GRANT: 'Asignación',
  CONSUME: 'Consumo',
  REFUND: 'Reembolso',
  EXPIRE: 'Caducidad',
};

export const TransactionHistoryTable: React.FC<{
  transactions: WalletTransaction[];
  isLoading: boolean;
}> = ({ transactions, isLoading }) => (
  <Card className="border-slate-200 shadow-sm">
    <CardHeader><CardTitle>Ledger de créditos</CardTitle></CardHeader>
    <CardContent className="p-0">
      {isLoading ? (
        <p className="p-6 text-sm text-slate-500">Cargando movimientos…</p>
      ) : transactions.length === 0 ? (
        <p className="p-6 text-sm text-slate-500">Todavía no hay movimientos.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr><th className="px-4 py-3">Tipo</th><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Reserva</th><th className="px-4 py-3 text-right">Movimiento</th><th className="px-4 py-3 text-right">Saldo</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.map((entry) => (
                <tr key={entry.id}>
                  <td className="px-4 py-3 font-semibold">{labels[entry.type]}</td>
                  <td className="px-4 py-3 text-slate-500">{new Date(entry.createdAt).toLocaleString('es-PE')}</td>
                  <td className="px-4 py-3">{entry.reservationId ? <Link className="text-blue-600 hover:underline" to="/reservations">Ver reserva</Link> : '—'}</td>
                  <td className={`px-4 py-3 text-right font-bold ${entry.amount >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{entry.amount > 0 ? '+' : ''}{entry.amount}</td>
                  <td className="px-4 py-3 text-right">{entry.balanceAfter}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </CardContent>
  </Card>
);
