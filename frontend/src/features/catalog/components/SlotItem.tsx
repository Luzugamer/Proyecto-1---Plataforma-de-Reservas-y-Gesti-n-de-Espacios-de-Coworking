import React from 'react';
import { AvailabilitySlot, SlotStatus } from '../types';
import { cn } from '@/shared/utils/cn';
import { Lock, Ban, Clock, CheckCircle2 } from 'lucide-react';

interface SlotItemProps {
  slot: AvailabilitySlot;
  isSelected?: boolean;
  onToggleSelect?: (slot: AvailabilitySlot) => void;
  disabled?: boolean;
}

const statusConfig: Record<
  SlotStatus,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    styles: string;
    isAvailable: boolean;
  }
> = {
  AVAILABLE: {
    label: 'Disponible',
    icon: CheckCircle2,
    styles:
      'border-emerald-300 bg-emerald-50/70 text-emerald-900 hover:bg-emerald-100 hover:border-emerald-500 focus-visible:ring-emerald-500',
    isAvailable: true,
  },
  HELD: {
    label: 'En Retención (Hold)',
    icon: Lock,
    styles:
      'border-amber-200 bg-amber-50/60 text-amber-800 cursor-not-allowed opacity-85',
    isAvailable: false,
  },
  BOOKED: {
    label: 'Reservado',
    icon: Clock,
    styles:
      'border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed opacity-75',
    isAvailable: false,
  },
  BLOCKED: {
    label: 'Fuera de Servicio',
    icon: Ban,
    styles:
      'border-red-200 bg-red-50/80 text-red-700 cursor-not-allowed opacity-80 bg-[repeating-linear-gradient(45deg,transparent,transparent_6px,rgba(239,68,68,0.06)_6px,rgba(239,68,68,0.06)_12px)]',
    isAvailable: false,
  },
};

export const SlotItem: React.FC<SlotItemProps> = ({
  slot,
  isSelected = false,
  onToggleSelect,
  disabled = false,
}) => {
  const config = statusConfig[slot.status];
  const Icon = config.icon;

  // Extraer horas en formato HH:mm (UTC o local)
  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch {
      return isoString.substring(11, 16);
    }
  };

  const timeLabel = `${formatTime(slot.startsAt)} - ${formatTime(slot.endsAt)}`;
  const isDisabled = disabled || !config.isAvailable;

  const handleClick = () => {
    if (!isDisabled && onToggleSelect) {
      onToggleSelect(slot);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isDisabled}
      aria-label={`Slot ${timeLabel}, estado: ${config.label}`}
      className={cn(
        'group relative flex flex-col items-center justify-between rounded-lg border p-2.5 text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
        config.styles,
        isSelected && 'ring-2 ring-blue-600 bg-blue-100/90 border-blue-600 text-blue-950 font-bold shadow-sm'
      )}
    >
      <div className="flex items-center gap-1 text-[11px] font-bold tracking-tight">
        <Icon className="h-3 w-3 shrink-0" />
        <span>{timeLabel}</span>
      </div>

      <span className="mt-1 text-[10px] font-medium opacity-90">
        {isSelected ? 'Seleccionado' : config.label}
      </span>
    </button>
  );
};
