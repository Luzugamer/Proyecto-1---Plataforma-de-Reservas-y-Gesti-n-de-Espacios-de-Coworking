import React, { useState } from 'react';
import { Reservation } from '../types';
import { ReservationStatusBadge } from './ReservationStatusBadge';
import { getCheckinWindowStatus } from '../utils/refundCalculator';
import { useCheckinReservation } from '../hooks/useCheckinReservation';
import { Card, CardContent } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Alert, AlertTitle, AlertDescription } from '@/shared/components/ui/Alert';
import { CheckCircle2, Search, User, Clock, AlertTriangle } from 'lucide-react';

interface ReceptionCheckinViewProps {
  reservations: Reservation[];
  isLoading: boolean;
}

export const ReceptionCheckinView: React.FC<ReceptionCheckinViewProps> = ({
  reservations,
  isLoading,
}) => {
  const [search, setSearch] = useState('');
  const { mutate: checkin, isPending: isCheckingIn, error: checkinError } = useCheckinReservation();

  const filtered = reservations.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      r.id.toLowerCase().includes(q) ||
      (r.userName && r.userName.toLowerCase().includes(q)) ||
      (r.resourceName && r.resourceName.toLowerCase().includes(q)) ||
      r.userId.toLowerCase().includes(q)
    );
  });

  const formatTime = (startsAt: string, endsAt: string) => {
    try {
      const s = new Date(startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      const e = new Date(endsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      return `${s} - ${e}`;
    } catch {
      return `${startsAt.substring(11, 16)} - ${endsAt.substring(11, 16)}`;
    }
  };

  return (
    <div className="space-y-4">
      {checkinError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error en el Check-in</AlertTitle>
          <AlertDescription>{checkinError.message}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="space-y-0.5">
          <h3 className="text-base font-bold text-slate-900">Mostrador de Recepción — Check-in Rápido</h3>
          <p className="text-xs text-slate-500">
            Valida la asistencia de los miembros al ingresar a la sede (Ventana: ±15 min).
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por código, miembro o sala..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-xs text-slate-800 shadow-sm focus:border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-600/20"
          />
        </div>
      </div>

      <Card className="border-slate-200 bg-white shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Código</th>
                  <th className="py-3 px-4">Miembro</th>
                  <th className="py-3 px-4">Espacio / Sala</th>
                  <th className="py-3 px-4">Horario</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      Cargando lista de reservas operativas...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No se encontraron reservas con el criterio de búsqueda.
                    </td>
                  </tr>
                ) : (
                  filtered.map((resv) => {
                    const windowCheck = getCheckinWindowStatus(resv.startsAt);
                    const isConfirmed = resv.status === 'CONFIRMED';
                    const isCheckedIn = resv.status === 'CHECKED_IN';

                    return (
                      <tr key={resv.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">{resv.id}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span className="font-semibold text-slate-800">{resv.userName || resv.userId}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-medium text-slate-700">{resv.resourceName || resv.resourceId}</span>
                        </td>
                        <td className="py-3 px-4 font-mono">
                          <div className="flex items-center gap-1 text-slate-600">
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                            {formatTime(resv.startsAt, resv.endsAt)}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <ReservationStatusBadge status={resv.status} />
                        </td>
                        <td className="py-3 px-4 text-right">
                          {isConfirmed && (
                            <Button
                              size="sm"
                              onClick={() => checkin(resv.id)}
                              disabled={!windowCheck.isWithinWindow || isCheckingIn}
                              isLoading={isCheckingIn}
                              className="text-xs bg-emerald-600 hover:bg-emerald-700 font-bold"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                              Validar Check-in
                            </Button>
                          )}
                          {isCheckedIn && (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded text-[11px] border border-emerald-200">
                              <CheckCircle2 className="h-3 w-3" />
                              Ingresado
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
