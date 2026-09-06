import React from 'react';
import { ReservationStatus } from '../types';
import { Badge } from '@/shared/components/ui/Badge';
import { Clock, CheckCircle2, CheckCheck, XCircle, AlertOctagon, Hourglass } from 'lucide-react';

interface ReservationStatusBadgeProps {
  status: ReservationStatus;
  className?: string;
}

const statusBadgeConfig: Record<
  ReservationStatus,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    className: string;
  }
> = {
  PENDING: {
    label: 'Pendiente',
    icon: Hourglass,
    className: 'border-amber-300 bg-amber-50 text-amber-800',
  },
  CONFIRMED: {
    label: 'Confirmada',
    icon: Clock,
    className: 'border-blue-300 bg-blue-50 text-blue-800',
  },
  CHECKED_IN: {
    label: 'Check-in Realizado',
    icon: CheckCircle2,
    className: 'border-emerald-300 bg-emerald-50 text-emerald-800 font-bold',
  },
  COMPLETED: {
    label: 'Completada',
    icon: CheckCheck,
    className: 'border-slate-300 bg-slate-100 text-slate-700',
  },
  CANCELLED: {
    label: 'Cancelada',
    icon: XCircle,
    className: 'border-red-300 bg-red-50 text-red-800',
  },
  NO_SHOW: {
    label: 'No Presentado (No-Show)',
    icon: AlertOctagon,
    className: 'border-purple-300 bg-purple-50 text-purple-900',
  },
};

export const ReservationStatusBadge: React.FC<ReservationStatusBadgeProps> = ({
  status,
  className,
}) => {
  const config = statusBadgeConfig[status] || {
    label: status,
    icon: Clock,
    className: 'border-slate-300 bg-slate-100 text-slate-700',
  };
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={`flex items-center gap-1 text-[11px] font-semibold py-0.5 px-2.5 ${config.className} ${className || ''}`}>
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span>{config.label}</span>
    </Badge>
  );
};
