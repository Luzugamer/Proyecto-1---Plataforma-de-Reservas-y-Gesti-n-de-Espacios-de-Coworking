import React, { useState } from 'react';
import { TopupPackage } from '../types';
import { useTopupPackages } from '../hooks/useTopupPackages';
import { useTopupCredits } from '../hooks/useTopupCredits';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Alert, AlertTitle, AlertDescription } from '@/shared/components/ui/Alert';
import { Coins, CheckCircle2, AlertTriangle, X, Sparkles } from 'lucide-react';
import { cn } from '@/shared/utils/cn';

interface TopupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TopupModal: React.FC<TopupModalProps> = ({ isOpen, onClose }) => {
  const { data: packages = [], isLoading } = useTopupPackages();
  const [selectedPkgId, setSelectedPkgId] = useState<string>('pkg_team_15');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const topupMutation = useTopupCredits();

  if (!isOpen) return null;

  const handlePurchase = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await topupMutation.mutateAsync({ packageId: selectedPkgId });
      setSuccessMsg(`¡Compra exitosa! Se añadieron +${res.creditsAdded} créditos a tu billetera. Saldo total: ${res.newBalance} créditos.`);
      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 2000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'No se pudo procesar la recarga.';
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
              <div className="rounded-lg bg-amber-100 p-2 text-amber-700">
                <Coins className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-slate-900">
                  Comprar Paquete de Créditos Extra
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Los créditos adicionales no expiran y se consumen automáticamente al reservar.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {successMsg && (
              <Alert variant="success">
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>¡Recarga Procesada!</AlertTitle>
                <AlertDescription>{successMsg}</AlertDescription>
              </Alert>
            )}

            {errorMsg && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error al recargar</AlertTitle>
                <AlertDescription>{errorMsg}</AlertDescription>
              </Alert>
            )}

            {isLoading ? (
              <div className="py-8 text-center text-xs text-slate-500">
                Cargando paquetes de créditos disponibles...
              </div>
            ) : (
              <div className="grid gap-3">
                {packages.map((pkg: TopupPackage) => {
                  const isSelected = selectedPkgId === pkg.id;
                  return (
                    <div
                      key={pkg.id}
                      onClick={() => setSelectedPkgId(pkg.id)}
                      className={cn(
                        'relative flex cursor-pointer items-center justify-between rounded-xl border p-4 transition-all',
                        isSelected
                          ? 'border-amber-500 bg-amber-50/40 ring-2 ring-amber-500'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'flex h-5 w-5 items-center justify-center rounded-full border',
                            isSelected
                              ? 'border-amber-600 bg-amber-600 text-white'
                              : 'border-slate-300'
                          )}
                        >
                          {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">
                              {pkg.credits} Créditos
                            </span>
                            {pkg.savingsBadge && (
                              <span className="inline-flex items-center gap-0.5 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                                <Sparkles className="h-3 w-3" />
                                {pkg.savingsBadge}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500">{pkg.label}</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-base font-extrabold text-slate-900">
                          ${pkg.price}
                        </span>
                        <span className="text-xs text-slate-500 ml-1">{pkg.currency}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <Button variant="outline" onClick={onClose} disabled={topupMutation.isPending}>
                Cancelar
              </Button>
              <Button
                onClick={handlePurchase}
                isLoading={topupMutation.isPending}
                className="bg-amber-600 text-white hover:bg-amber-700 font-bold"
              >
                Confirmar Compra
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
