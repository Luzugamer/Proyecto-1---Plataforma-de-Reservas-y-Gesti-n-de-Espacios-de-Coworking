import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ReservationResponse } from '../types';
import { Resource } from '@/features/catalog/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { CheckCircle2, Calendar, Clock, Coins, ArrowRight } from 'lucide-react';

interface ReservationSuccessModalProps {
  reservation: ReservationResponse;
  resource: Resource | null;
  onClose: () => void;
}

export const ReservationSuccessModal: React.FC<ReservationSuccessModalProps> = ({
  reservation,
  resource,
  onClose,
}) => {
  const navigate = useNavigate();

  const formatTimeRange = (startsAt: string, endsAt: string) => {
    try {
      const start = new Date(startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      const end = new Date(endsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      const date = new Date(startsAt).toLocaleDateString([], { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
      return { date, time: `${start} - ${end}` };
    } catch {
      return { date: startsAt.substring(0, 10), time: `${startsAt.substring(11, 16)} - ${endsAt.substring(11, 16)}` };
    }
  };

  const { date, time } = formatTimeRange(reservation.startsAt, reservation.endsAt);

  const handleFinish = () => {
    onClose();
    navigate('/dashboard');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in">
      <Card className="w-full max-w-md shadow-2xl border-emerald-200 bg-white text-center">
        <CardHeader className="space-y-2 pb-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl font-black text-slate-900">
            ¡Reserva Confirmada!
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Tu espacio ha sido reservado exitosamente y los créditos fueron descontados.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 pt-2 text-sm text-left">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2.5 text-xs">
            <div className="flex justify-between border-b border-slate-200/60 pb-2">
              <span className="text-slate-500 font-medium">Código de Reserva:</span>
              <strong className="font-mono text-slate-900 text-xs">{reservation.reservationId}</strong>
            </div>

            <div className="flex justify-between border-b border-slate-200/60 pb-2">
              <span className="text-slate-500 font-medium">Espacio:</span>
              <strong className="text-slate-900">{resource?.name || 'Sala de Coworking'}</strong>
            </div>

            <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
              <span className="text-slate-500 font-medium flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-blue-600" />
                Fecha:
              </span>
              <span className="font-semibold capitalize text-slate-800">{date}</span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
              <span className="text-slate-500 font-medium flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-blue-600" />
                Horario:
              </span>
              <span className="font-mono font-bold text-slate-900">{time}</span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-slate-500 font-medium flex items-center gap-1">
                <Coins className="h-3.5 w-3.5 text-amber-600" />
                Créditos Deducidos:
              </span>
              <span className="font-black text-emerald-700">{reservation.creditsDeducted} créditos</span>
            </div>
          </div>

          <div className="rounded-lg bg-blue-50 p-3 border border-blue-100 text-xs text-blue-800 space-y-1">
            <p className="font-semibold">Recordatorio de Asistencia (RN-CHK):</p>
            <p className="text-[11px] leading-relaxed">
              El check-in se habilitará desde 15 minutos antes hasta 15 minutos después de la hora de inicio.
            </p>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-2 pt-0">
          <Button onClick={handleFinish} className="w-full text-xs font-bold gap-1 bg-blue-600 hover:bg-blue-700">
            <span>Ir a Mi Panel Principal</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" onClick={onClose} className="w-full text-xs text-slate-600">
            Seguir Explorando Espacios
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};
