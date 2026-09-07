import React, { useState } from 'react';
import { Resource, BlockResourceResponse } from '../types';
import { useBlockResource } from '../hooks/useBlockResource';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Label } from '@/shared/components/ui/Label';
import { Alert, AlertTitle, AlertDescription } from '@/shared/components/ui/Alert';
import { ShieldAlert, CheckCircle2, AlertTriangle, X } from 'lucide-react';

interface AdminBlockModalProps {
  resource: Resource | null;
  onClose: () => void;
}

export const AdminBlockModal: React.FC<AdminBlockModalProps> = ({ resource, onClose }) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const [date, setDate] = useState(todayStr);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('12:00');
  const [reason, setReason] = useState('Mantenimiento técnico y preventivo de instalaciones');
  const [impactResult, setImpactResult] = useState<BlockResourceResponse | null>(null);

  const { mutate: blockResource, isPending, error } = useBlockResource(resource?.id || '');

  if (!resource) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const startsAt = new Date(`${date}T${startTime}:00`).toISOString();
    const endsAt = new Date(`${date}T${endTime}:00`).toISOString();

    blockResource(
      { startsAt, endsAt, reason },
      {
        onSuccess: (data) => {
          setImpactResult(data);
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in">
      <Card className="w-full max-w-lg shadow-2xl border-red-200">
        <CardHeader className="flex flex-row items-start justify-between pb-3 border-b border-slate-100">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-red-600">
              <ShieldAlert className="h-5 w-5" />
              <CardTitle className="text-lg">Bloquear Recurso por Mantenimiento</CardTitle>
            </div>
            <CardDescription className="text-xs">
              {resource.name} (Sede ID: {resource.siteId})
            </CardDescription>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 rounded-md p-1"
          >
            <X className="h-5 w-5" />
          </button>
        </CardHeader>

        <CardContent className="pt-4 space-y-4 text-sm">
          {impactResult ? (
            <div className="space-y-4">
              <Alert variant="success">
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Bloqueo administrativo registrado con éxito</AlertTitle>
                <AlertDescription>
                  El recurso ha quedado marcado como "Fuera de Servicio" para el rango seleccionado.
                </AlertDescription>
              </Alert>

              <div className="rounded-lg bg-slate-50 p-4 border border-slate-200 text-xs space-y-2">
                <span className="font-bold text-slate-800 block">Reporte de Impacto Operativo (HU-02):</span>
                <p className="text-slate-600">
                  Reservas canceladas automáticamente:{' '}
                  <strong className="text-red-600">{impactResult.cancelledReservations.length}</strong>
                </p>
                {impactResult.cancelledReservations.length > 0 && (
                  <ul className="list-disc pl-4 text-slate-600 space-y-1">
                    {impactResult.cancelledReservations.map((resv) => (
                      <li key={resv.reservationId}>
                        Reserva <code className="text-slate-800">{resv.reservationId}</code>: Reembolsados{' '}
                        <strong>{resv.refundedCredits} créditos</strong> (100%).
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <Button onClick={onClose} className="w-full">
                Cerrar y Actualizar
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Error al crear bloqueo</AlertTitle>
                  <AlertDescription>{error.message}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-1">
                <Label htmlFor="block-date" required>
                  Fecha del Bloqueo
                </Label>
                <Input
                  id="block-date"
                  type="date"
                  value={date}
                  min={todayStr}
                  onChange={(e) => setDate(e.target.value)}
                  disabled={isPending}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="start-time" required>
                    Hora Inicio
                  </Label>
                  <Input
                    id="start-time"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    disabled={isPending}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="end-time" required>
                    Hora Fin
                  </Label>
                  <Input
                    id="end-time"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    disabled={isPending}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="reason" required>
                  Motivo del Mantenimiento
                </Label>
                <Input
                  id="reason"
                  placeholder="Ej. Limpieza profunda, reparación de aire acondicionado"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  disabled={isPending}
                />
              </div>

              <div className="rounded-md bg-amber-50 p-3 border border-amber-200 text-xs text-amber-800">
                ⚠️ <strong>Aviso:</strong> Si existen reservas confirmadas de miembros en esta franja horaria,
                el sistema las cancelará automáticamente y les reembolsará el 100% de los créditos deducidos.
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
                  Cancelar
                </Button>
                <Button type="submit" variant="destructive" isLoading={isPending}>
                  Confirmar Bloqueo y Cancelaciones
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
