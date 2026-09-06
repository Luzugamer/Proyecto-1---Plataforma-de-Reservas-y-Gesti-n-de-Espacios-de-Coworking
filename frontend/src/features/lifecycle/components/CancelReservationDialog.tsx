import React, { useState } from 'react';
import { Reservation, CancelReservationResponse } from '../types';
import { calculateEstimatedRefund } from '../utils/refundCalculator';
import { useCancelReservation } from '../hooks/useCancelReservation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Alert, AlertTitle, AlertDescription } from '@/shared/components/ui/Alert';
import { AlertTriangle, CheckCircle2, Coins, Clock, X } from 'lucide-react';

interface CancelReservationDialogProps {
  reservation: Reservation | null;
  onClose: () => void;
  onCancelled?: (result: CancelReservationResponse) => void;
}

export const CancelReservationDialog: React.FC<CancelReservationDialogProps> = ({
  reservation,
  onClose,
  onCancelled,
}) => {
  const [result, setResult] = useState<CancelReservationResponse | null>(null);
  const { mutate: cancelReservation, isPending, error } = useCancelReservation();

  if (!reservation) return null;

  // Cálculo en tiempo real del reembolso estimado (RN-CAN)
  const refundEstimate = calculateEstimatedRefund(
    reservation.startsAt,
    reservation.creditsDeducted
  );

  const handleConfirmCancel = () => {
    cancelReservation(reservation.id, {
      onSuccess: (data) => {
        setResult(data);
        onCancelled?.(data);
      },
    });
  };

  const getTierBadgeStyle = () => {
    if (refundEstimate.tier === 'EARLY') return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    if (refundEstimate.tier === 'LATE') return 'bg-amber-50 text-amber-800 border-amber-200';
    return 'bg-red-50 text-red-800 border-red-200';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in">
      <Card className="w-full max-w-lg shadow-2xl border-red-200 bg-white">
        <CardHeader className="flex flex-row items-start justify-between pb-3 border-b border-slate-100">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              <CardTitle className="text-xl font-bold">Cancelar Reserva</CardTitle>
            </div>
            <CardDescription className="text-xs text-slate-500">
              Código de Reserva: <strong className="font-mono text-slate-700">{reservation.id}</strong>
            </CardDescription>
          </div>
          <button
            onClick={onClose}
            disabled={isPending}
            className="text-slate-400 hover:text-slate-600 rounded-md p-1"
          >
            <X className="h-5 w-5" />
          </button>
        </CardHeader>

        <CardContent className="space-y-4 pt-4 text-sm">
          {result ? (
            <div className="space-y-4">
              <Alert variant="success">
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Reserva cancelada exitosamente</AlertTitle>
                <AlertDescription>
                  El espacio ha sido liberado para otros miembros y los créditos aplicables han sido reembolsados a tu billetera.
                </AlertDescription>
              </Alert>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2 text-xs">
                <span className="font-bold text-slate-800 block">Resultado de Cancelación (RN-CAN):</span>
                <div className="flex justify-between text-slate-600">
                  <span>Porcentaje aplicado:</span>
                  <strong className="text-slate-900">{result.refundPercentage}%</strong>
                </div>
                <div className="flex justify-between text-slate-600 border-t border-slate-200/60 pt-2">
                  <span>Créditos Reembolsados:</span>
                  <strong className="text-emerald-700 font-bold text-sm">
                    +{result.refundedCredits} créditos
                  </strong>
                </div>
              </div>

              <Button onClick={onClose} className="w-full">
                Entendido y Cerrar
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>No se pudo cancelar la reserva</AlertTitle>
                  <AlertDescription>{error.message}</AlertDescription>
                </Alert>
              )}

              {/* Ficha de la Reserva */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Espacio:</span>
                  <strong className="text-slate-900">{reservation.resourceName || 'Sala de Coworking'}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Créditos deducidos originalmente:</span>
                  <span className="font-bold text-slate-800">{reservation.creditsDeducted} créditos</span>
                </div>
              </div>

              {/* Previsualización del Reembolso (Criterio EARS) */}
              <div className={`rounded-xl border p-4 space-y-2.5 ${getTierBadgeStyle()}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wide">
                    {refundEstimate.tierLabel}
                  </span>
                  <span className="text-lg font-black">{refundEstimate.percentage}% Reembolso</span>
                </div>

                <div className="flex items-center justify-between text-xs border-t border-current/20 pt-2">
                  <span className="flex items-center gap-1">
                    <Coins className="h-3.5 w-3.5" />
                    Créditos a recuperar si cancelas ahora:
                  </span>
                  <strong className="text-sm font-black">
                    +{refundEstimate.refundedCredits} créditos
                  </strong>
                </div>
              </div>

              {/* Resumen de la Política RN-CAN */}
              <div className="rounded-lg bg-slate-100 p-3 text-[11px] text-slate-600 space-y-1">
                <span className="font-bold text-slate-700 flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  Escala de Cancelación (RN-CAN):
                </span>
                <ul className="list-disc pl-4 space-y-0.5">
                  <li><strong>Más de 24h antes:</strong> 100% de reembolso en créditos.</li>
                  <li><strong>Entre 24h y 2h antes:</strong> 50% de reembolso en créditos.</li>
                  <li><strong>Menos de 2h antes:</strong> 0% de reembolso (no acumulable).</li>
                </ul>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="outline" onClick={onClose} disabled={isPending} className="text-xs">
                  Conservar Reserva
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleConfirmCancel}
                  isLoading={isPending}
                  className="text-xs font-bold"
                >
                  Confirmar Cancelación (+{refundEstimate.refundedCredits} créditos)
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
