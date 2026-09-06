import React from 'react';
import { useWalletBalance } from '../hooks/useWalletBalance';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Coins } from 'lucide-react';
import { cn } from '@/shared/utils/cn';

interface CreditsBalanceBadgeProps {
  className?: string;
  showDetails?: boolean;
}

export const CreditsBalanceBadge: React.FC<CreditsBalanceBadgeProps> = ({
  className,
  showDetails = false,
}) => {
  const { isAuthenticated } = useAuth();
  const { data: balance, isLoading } = useWalletBalance();

  if (!isAuthenticated) return null;

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-900 shadow-sm',
        className
      )}
      title="Bolsa de Créditos de Membresía"
    >
      <Coins className="h-3.5 w-3.5 text-amber-600 shrink-0" />
      {isLoading ? (
        <span className="h-3 w-6 bg-amber-200/60 rounded animate-pulse"></span>
      ) : (
        <span>{balance?.availableCredits ?? 0} {showDetails ? 'créditos disponibles' : 'créditos'}</span>
      )}
    </div>
  );
};
