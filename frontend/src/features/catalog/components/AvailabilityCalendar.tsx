import React from 'react';
import { AvailabilitySlot } from '../types';
import { useAvailability } from '../hooks/useAvailability';
import { SlotItem } from './SlotItem';
import { Button } from '@/shared/components/ui/Button';
import { Alert, AlertTitle, AlertDescription } from '@/shared/components/ui/Alert';
import { Calendar as CalendarIcon, RefreshCw, AlertTriangle, Info } from 'lucide-react';

interface AvailabilityCalendarProps {
  resourceId: string;
  selectedDate: string;
  onDateChange: (date: string) => void;
  selectedSlots?: AvailabilitySlot[];
  onToggleSlot?: (slot: AvailabilitySlot) => void;
}

export const AvailabilityCalendar: React.FC<AvailabilityCalendarProps> = ({
  resourceId,
  selectedDate,
  onDateChange,
  selectedSlots = [],
  onToggleSlot,
}) => {
  const {
    data: availability,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useAvailability(resourceId, selectedDate, true);

  const slots = availability?.slots || [];

  return (
    <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      {/* Barra superior de filtros de fecha y acción de refresco */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-blue-600 shrink-0" />
          <div>
            <label htmlFor="date-picker" className="block text-xs font-bold text-slate-500 uppercase">
              Fecha de Reserva
            </label>
            <input
              id="date-picker"
              type="date"
              value={selectedDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => onDateChange(e.target.value)}
              className="h-9 rounded-md border border-slate-300 bg-white px-3 py-1 text-sm font-semibold text-slate-800 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="text-xs text-slate-700 font-medium"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isFetching ? 'animate-spin text-blue-600' : ''}`} />
            {isFetching ? 'Actualizando...' : 'Actualizar Disponibilidad'}
          </Button>
          <span className="text-[11px] text-slate-400 hidden md:inline">
            (Auto-refresco cada 30s activo)
          </span>
        </div>
      </div>

      {/* Leyenda de Estados */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg bg-slate-50 p-2.5 text-xs text-slate-600 border border-slate-200">
        <span className="font-bold text-slate-700 mr-1 flex items-center gap-1">
          <Info className="h-3.5 w-3.5 text-slate-400" />
          Leyenda:
        </span>
        <div className="flex items-center gap-1">
          <span className="flex h-3 w-3 rounded-full bg-emerald-500"></span>
          <span className="font-medium text-slate-700">Disponible</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="flex h-3 w-3 rounded-full bg-amber-400"></span>
          <span className="font-medium text-slate-700">En Retención (Hold)</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="flex h-3 w-3 rounded-full bg-slate-400"></span>
          <span className="font-medium text-slate-700">Reservado</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="flex h-3 w-3 rounded-full bg-red-500"></span>
          <span className="font-medium text-slate-700">Fuera de Servicio</span>
        </div>
      </div>

      {/* Mensaje de Error */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error al consultar disponibilidad</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{error.message}</span>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="ml-3 text-xs bg-white text-red-900 border-red-200">
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Estado de Carga */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 md:grid-cols-6 py-6">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="h-16 rounded-lg bg-slate-100 animate-pulse border border-slate-200" />
          ))}
        </div>
      ) : (
        /* Grilla de Slots de 30 min */
        <div>
          <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-600">
            Franjas Horarias Disponibles (Paso mínimo: 30 min)
          </h4>
          {slots.length === 0 ? (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-slate-500">
              La sede no tiene horario operativo o slots configurados para esta fecha.
            </p>
          ) : <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {slots.map((slot, index) => {
              const isSelected = selectedSlots.some(
                (s) => s.startsAt === slot.startsAt && s.endsAt === slot.endsAt
              );

              return (
                <SlotItem
                  key={`${slot.startsAt}-${index}`}
                  slot={slot}
                  isSelected={isSelected}
                  onToggleSelect={onToggleSlot}
                />
              );
            })}
          </div>}
        </div>
      )}
    </div>
  );
};
