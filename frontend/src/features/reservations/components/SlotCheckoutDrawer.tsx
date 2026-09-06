import React from 'react';
import { HoldResponse, ReservationResponse } from '../types';
import { Resource } from '@/features/catalog/types';
import { useWalletBalance } from '../hooks/useWalletBalance';
import { useConfirmReservation } from '../hooks/useConfirmReservation';
import { useReleaseHold } from '../hooks/useReleaseHold';
import { HoldCountdown } from './HoldCountdown';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Alert, AlertTitle, AlertDescription } from '@/shared/components/ui/Alert';
import { Badge } from '@/shared/components/ui/Badge';
import { Calendar, Clock, Coins, CheckCircle2, AlertTriangle, X, ShieldAlert } from 'lucide-react';

interface SlotCheckoutDrawerProps {
  hold: HoldResponse | null;
  resource: Resource | null;
  onClose: () => void;
  onReservationSuccess: (reservation: ReservationResponse) => void;
}

export const SlotCheckoutDrawer: React.FC<SlotCheckoutDrawerProps> = ({
  hold,
  resource,
  onClose,
  onReservationSuccess,
}) => {
  const { data: wallet, isLoading: isLoadingWallet } = useWalletBalance();
  const { mutate: confirmReservation, isPending: isConfirming, error: confirmError } = useConfirmReservation(
    resource?.id
  );
  const { mutate: releaseHold, isPending: isReleasing } = useReleaseHold(resource?.id);

  if (!hold || !resource) return null;

  const availableCredits = wallet?.availableCredits ?? 0;
  const creditsRequired = hold.creditsRequired;
  const hasSufficientCredits = availableCredits >= creditsRequired;
  const remainingAfter = availableCredits - creditsRequired;

  const formatTimeRange = (startsAt: string, endsAt: string) => {
    try {
      const start = new Date(startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      const end = new Date(endsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      const date = new Date(startsAt).toLocaleDateString([], { weekday: 'short', day: '2-digit', month: 'short' });
      return { date, time: `${start} - ${end}` };
    } catch {
      return { date: startsAt.substring(0, 10), time: `${startsAt.substring(11, 16)} - ${endsAt.substring(11, 16)}` };
    }
  };

  const { date, time } = formatTimeRange(hold.startsAt, hold.endsAt);

  const handleCancelAndClose = () => {
    // Liberar hold manualmente para buena ciudadanía
    releaseHold(hold.holdId);
    onClose();
  };

  const handleConfirm = () => {
    if (!hasSufficientCredits || isConfirming) return;

    confirmReservation(
      { holdId: hold.holdId },
      {
        onSuccess: (data) => {
          onReservationSuccess(data);
        },
      }
    );
  };

  const isHoldExpired = confirmError?.code === 'HOLD_EXPIRED';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 p-0 sm:p-4 backdrop-blur-sm animate-in fade-in">
      <Card className="w-full max-w-lg rounded-t-2xl sm:rounded-xl shadow-2xl border-slate-200 bg-white">
        {/* Header */}
        <CardHeader className="flex flex-row items-start justify-between pb-3 border-b border-slate-100">
          <div className="space-y-1">
            <Badge variant="default" className="text-[11px] mb-1">
              Confirmación de Reserva
            </Badge>
            <CardTitle className="text-xl font-black text-slate-900 leading-tight">
              {resource.name}
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Verifica los detalles y confirma el canje de créditos de tu membresía.
            </CardDescription>
          </div>
          <button
            onClick={handleCancelAndClose}
            disabled={isConfirming || isReleasing}
            className="text-slate-400 hover:text-slate-600 rounded-md p-1"
          >
            <X className="h-5 w-5" />
          </button>
        </CardHeader>

        <CardContent className="space-y-4 pt-4 text-sm">
          {/* Contador Regresivo */}
          <HoldCountdown expiresAt={hold.expiresAt} onExpire={onClose} />

          {/* Errores */}
          {confirmError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>
                {isHoldExpired ? 'El tiempo de reserva ha expirado' : 'No se pudo confirmar la reserva'}
              </AlertTitle>
              <AlertDescription>{confirmError.message}</AlertDescription>
            </Alert>
          )}

          {/* Ficha Resumen del Slot */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-700">
              <span className="flex items-center gap-1.5 font-medium text-slate-500">
                <Calendar className="h-4 w-4 text-blue-600" />
                Fecha:
              </span>
              <span className="font-bold capitalize">{date}</span>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-700 border-t border-slate-200/60 pt-2">
              <span className="flex items-center gap-1.5 font-medium text-slate-500">
                <Clock className="h-4 w-4 text-blue-600" />
                Horario Seleccionado:
              </span>
              <span className="font-bold text-slate-900 font-mono">{time}</span>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-700 border-t border-slate-200/60 pt-2">
              <span className="flex items-center gap-1.5 font-medium text-slate-500">
                <Coins className="h-4 w-4 text-amber-600" />
                Costo Total de la Reserva:
              </span>
              <span className="font-black text-amber-900 text-sm">{creditsRequired} créditos</span>
            </div>
          </div>

          {/* Estado de Billetera y Saldo */}
          <div className="rounded-xl border border-slate-200 p-4 space-y-2 bg-white">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Billetera de Membresía
            </span>

            {isLoadingWallet ? (
              <div className="h-8 bg-slate-100 rounded animate-pulse"></div>
            ) : (
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Saldo disponible actual:</span>
                  <span className="font-bold text-slate-900">{availableCredits} créditos</span>
                </div>

                <div className="flex justify-between text-slate-600">
                  <span>Créditos a descontar:</span>
                  <span className="font-bold text-red-600">- {creditsRequired} créditos</span>
                </div>

                <div className="flex justify-between border-t border-slate-100 pt-2 text-slate-800 font-semibold">
                  <span>Saldo final estimado:</span>
                  <span className={remainingAfter >= 0 ? 'text-emerald-600 font-bold' : 'text-red-600 font-bold'}>
                    {remainingAfter} créditos
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Advertencia de Saldo Insuficiente (Criterio EARS) */}
          {!isLoadingWallet && !hasSufficientCredits && (
            <Alert variant="destructive">
              <ShieldAlert className="h-4 w-4" />
              <AlertTitle>Saldo Insuficiente de Créditos</AlertTitle>
              <AlertDescription>
                No tienes suficientes créditos para completar esta reserva. Tu saldo es de {availableCredits} y requieres {creditsRequired} créditos.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>

        {/* Footer y Acciones */}
        <CardFooter className="flex flex-col sm:flex-row gap-2 border-t border-slate-100 pt-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancelAndClose}
            disabled={isConfirming || isReleasing}
            className="w-full sm:w-1/2 text-xs"
          >
            {isReleasing ? 'Liberando...' : 'Cancelar y Liberar'}
          </Button>

          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!hasSufficientCredits || isConfirming || isHoldExpired}
            isLoading={isConfirming}
            className="w-full sm:w-1/2 text-xs bg-emerald-600 hover:bg-emerald-700 font-bold gap-1.5"
          >
            <CheckCircle2 className="h-4 w-4" />
            Confirmar Reserva
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};
