import React, { useState } from 'react';
import { MembershipPlan, UserSubscription } from '../types';
import { useSubscribePlan } from '../hooks/useSubscribePlan';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Alert, AlertTitle, AlertDescription } from '@/shared/components/ui/Alert';
import { ShieldCheck, CheckCircle2, AlertTriangle, X, Sparkles, ArrowRight } from 'lucide-react';

interface ChangePlanModalProps {
  selectedPlan: MembershipPlan | null;
  currentSubscription?: UserSubscription;
  onClose: () => void;
}

export const ChangePlanModal: React.FC<ChangePlanModalProps> = ({
  selectedPlan,
  currentSubscription,
  onClose,
}) => {
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const subscribeMutation = useSubscribePlan();

  if (!selectedPlan) return null;

  const currentCredits = currentSubscription?.monthlyCredits ?? 10;
  const targetCredits = selectedPlan.monthlyCredits;
  const isUpgrade = targetCredits > currentCredits;
  const creditDiff = Math.max(0, targetCredits - currentCredits);

  const handleConfirm = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await subscribeMutation.mutateAsync({ planId: selectedPlan.id });
      setSuccessMsg(
        `¡Cambio de plan exitoso! Ahora estás en el ${res.subscription.planName}. ${
          res.creditedDifference > 0
            ? `Se acreditaron +${res.creditedDifference} créditos de inmediato a tu billetera.`
            : ''
        }`
      );
      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 2000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'No se pudo actualizar la membresía.';
      setErrorMsg(message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg">
        <Card className="border-slate-200 shadow-2xl">
          <CardHeader className="relative pb-4">
            <button
              onClick={onClose}
              className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-blue-100 p-2 text-blue-700">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-slate-900">
                  Confirmar Cambio de Membresía
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Actualización a {selectedPlan.name} (${selectedPlan.pricePerMonth} / mes)
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {successMsg && (
              <Alert variant="success">
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>¡Membresía Actualizada!</AlertTitle>
                <AlertDescription>{successMsg}</AlertDescription>
              </Alert>
            )}

            {errorMsg && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error al cambiar de plan</AlertTitle>
                <AlertDescription>{errorMsg}</AlertDescription>
              </Alert>
            )}

            {/* Comparativa de Cuota */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Resumen de actualización de cuota
              </p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">Plan Actual</p>
                  <p className="font-bold text-slate-800 text-sm">
                    {currentSubscription?.planName || 'Plan Starter'}
                  </p>
                  <p className="text-xs text-slate-600">{currentCredits} cr/mes</p>
                </div>

                <ArrowRight className="h-5 w-5 text-blue-600 shrink-0" />

                <div className="text-right">
                  <p className="text-xs text-blue-600 font-semibold">Nuevo Plan</p>
                  <p className="font-bold text-blue-950 text-sm">{selectedPlan.name}</p>
                  <p className="text-xs text-blue-700 font-semibold">{targetCredits} cr/mes</p>
                </div>
              </div>

              {isUpgrade && creditDiff > 0 && (
                <div className="mt-2 rounded-lg bg-emerald-50 p-2.5 text-xs text-emerald-800 border border-emerald-200 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>
                    <strong>Acreditación Inmediata:</strong> Se sumarán <strong>+{creditDiff} créditos</strong> a tu billetera hoy mismo por la diferencia de nivel.
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <Button variant="outline" onClick={onClose} disabled={subscribeMutation.isPending}>
                Cancelar
              </Button>
              <Button
                onClick={handleConfirm}
                isLoading={subscribeMutation.isPending}
                className="bg-blue-600 text-white hover:bg-blue-700 font-bold"
              >
                Confirmar y Suscribirme
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
