import React from 'react';
import { Reservation } from '../types';
import { ReservationStatusBadge } from './ReservationStatusBadge';
import { getCheckinWindowStatus } from '../utils/refundCalculator';
import { useCheckinReservation } from '../hooks/useCheckinReservation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Calendar, Clock, MapPin, Coins, CheckCircle2, XCircle } from 'lucide-react';

interface ReservationCardProps {
  reservation: Reservation;
  onOpenCancel: (reservation: Reservation) => void;
}

export const ReservationCard: React.FC<ReservationCardProps> = ({
  reservation,
  onOpenCancel,
}) => {
  const { mutate: checkin, isPending: isCheckingIn } = useCheckinReservation();

  const formatDateTime = (startsAt: string, endsAt: string) => {
    try {
      const start = new Date(startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      const end = new Date(endsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      const date = new Date(startsAt).toLocaleDateString([], { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
      return { date, time: `${start} - ${end}` };
    } catch {
      return { date: startsAt.substring(0, 10), time: `${startsAt.substring(11, 16)} - ${endsAt.substring(11, 16)}` };
    }
  };

  const { date, time } = formatDateTime(reservation.startsAt, reservation.endsAt);
  const checkinStatus = getCheckinWindowStatus(reservation.startsAt);

  const isConfirmed = reservation.status === 'CONFIRMED';
  const isCheckedIn = reservation.status === 'CHECKED_IN';

  const handleSelfCheckin = () => {
    checkin(reservation.id);
  };

  return (
    <Card className="flex flex-col justify-between border-slate-200 hover:border-slate-300 hover:shadow-md transition-all bg-white">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <ReservationStatusBadge status={reservation.status} />
          <span className="font-mono text-xs text-slate-400 font-semibold">
            {reservation.id}
          </span>
        </div>

        <CardTitle className="text-base font-bold text-slate-900 mt-2 leading-snug">
          {reservation.resourceName || 'Espacio de Coworking'}
        </CardTitle>

        {reservation.siteName && (
          <CardDescription className="text-xs text-slate-500 flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5 text-slate-400" />
            {reservation.siteName}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="text-xs space-y-2.5 pb-4">
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-2">
          <div className="flex items-center justify-between text-slate-700">
            <span className="flex items-center gap-1.5 font-medium text-slate-500">
              <Calendar className="h-3.5 w-3.5 text-blue-600" />
              Fecha:
            </span>
            <span className="font-bold capitalize">{date}</span>
          </div>

          <div className="flex items-center justify-between text-slate-700 border-t border-slate-200/50 pt-1.5">
            <span className="flex items-center gap-1.5 font-medium text-slate-500">
              <Clock className="h-3.5 w-3.5 text-blue-600" />
              Horario:
            </span>
            <span className="font-mono font-bold text-slate-900">{time}</span>
          </div>

          <div className="flex items-center justify-between text-slate-700 border-t border-slate-200/50 pt-1.5">
            <span className="flex items-center gap-1.5 font-medium text-slate-500">
              <Coins className="h-3.5 w-3.5 text-amber-600" />
              Créditos Deducidos:
            </span>
            <span className="font-bold text-slate-800">{reservation.creditsDeducted} créditos</span>
          </div>
        </div>

        {/* Indicador de Check-in para reservas confirmadas */}
        {isConfirmed && (
          <div className="text-[11px] text-slate-500 bg-blue-50/60 p-2 rounded-lg border border-blue-100">
            {checkinStatus.isWithinWindow ? (
              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                ¡Ventana de check-in abierta! Puedes registrar tu llegada.
              </span>
            ) : checkinStatus.isTooEarly ? (
              <span>Check-in disponible 15 min antes del inicio (en {checkinStatus.minutesUntilStart} min).</span>
            ) : (
              <span className="text-amber-700">Ventana de check-in cerrada (+15 min de tolerancia transcurridos).</span>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex flex-col gap-2 pt-0 border-t border-slate-100 pt-3">
        {isConfirmed && (
          <div className="grid grid-cols-2 gap-2 w-full">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenCancel(reservation)}
              className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
            >
              <XCircle className="h-3.5 w-3.5 mr-1" />
              Cancelar
            </Button>

            <Button
              size="sm"
              onClick={handleSelfCheckin}
              disabled={!checkinStatus.isWithinWindow || isCheckingIn}
              isLoading={isCheckingIn}
              className="text-xs bg-emerald-600 hover:bg-emerald-700 font-bold"
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              Check-in
            </Button>
          </div>
        )}

        {isCheckedIn && (
          <div className="flex items-center justify-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 py-1.5 px-3 rounded-md w-full border border-emerald-200">
            <CheckCircle2 className="h-4 w-4" />
            Llegada registrada exitosamente
          </div>
        )}
      </CardFooter>
    </Card>
  );
};
