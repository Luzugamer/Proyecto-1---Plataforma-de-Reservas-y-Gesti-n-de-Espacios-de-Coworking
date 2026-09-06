import React from 'react';
import { useHoldCountdown } from '../hooks/useHoldCountdown';
import { Timer, AlertTriangle } from 'lucide-react';
import { cn } from '@/shared/utils/cn';

interface HoldCountdownProps {
  expiresAt: string;
  onExpire?: () => void;
}

export const HoldCountdown: React.FC<HoldCountdownProps> = ({ expiresAt, onExpire }) => {
  const { formattedTime, isExpired, isUrgent, remainingSeconds } = useHoldCountdown({
    expiresAt,
    onExpire,
  });

  const percentage = Math.min(100, Math.max(0, (remainingSeconds / 300) * 100));

  if (isExpired) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs font-semibold text-red-800">
        <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
        <span>El tiempo de retención temporal ha vencido. El espacio ha sido liberado.</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'space-y-1.5 rounded-lg border p-3 text-xs transition-colors',
        isUrgent
          ? 'border-red-200 bg-red-50/70 text-red-900 animate-pulse'
          : 'border-amber-200 bg-amber-50/80 text-amber-900'
      )}
    >
      <div className="flex items-center justify-between font-semibold">
        <div className="flex items-center gap-1.5">
          <Timer className={cn('h-4 w-4', isUrgent ? 'text-red-600' : 'text-amber-600')} />
          <span>Espacio retenido temporalmente:</span>
        </div>
        <span className="font-mono text-sm font-black tracking-wider">
          {formattedTime}
        </span>
      </div>

      {/* Barra de progreso */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className={cn(
            'h-full transition-all duration-1000',
            isUrgent ? 'bg-red-500' : 'bg-amber-500'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <p className="text-[11px] text-slate-500 text-center">
        Tienes 5 minutos para confirmar con tus créditos antes de que se libere.
      </p>
    </div>
  );
};
