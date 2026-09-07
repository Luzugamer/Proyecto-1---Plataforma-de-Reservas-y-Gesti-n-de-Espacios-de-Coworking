import React from 'react';
import { Link } from 'react-router-dom';
import { Resource, ResourceType } from '../types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import { Users, Laptop, Briefcase, CalendarCheck, ShieldAlert, Coins } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';

interface ResourceCardProps {
  resource: Resource;
  onOpenAdminBlock?: (resource: Resource) => void;
}

const typeConfig: Record<
  ResourceType,
  { label: string; icon: React.ComponentType<{ className?: string }>; badgeVariant: 'default' | 'secondary' | 'outline' }
> = {
  MEETING_ROOM: { label: 'Sala de Reuniones', icon: Users, badgeVariant: 'default' },
  HOT_DESK: { label: 'Hot Desk (Flexible)', icon: Laptop, badgeVariant: 'secondary' },
  DEDICATED_DESK: { label: 'Escritorio Dedicado', icon: Briefcase, badgeVariant: 'outline' },
};

export const ResourceCard: React.FC<ResourceCardProps> = ({ resource, onOpenAdminBlock }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'SITE_ADMIN';
  const config = typeConfig[resource.type];
  const Icon = config.icon;

  const formatCost = () => {
    if (resource.creditCost) {
      const { amount, unit } = resource.creditCost;
      if (unit === 'HOUR') return `${amount} créditos / hora`;
      if (unit === 'BLOCK_4_HOURS') return `${amount} créditos / bloque de 4 h`;
      if (unit === 'MONTH') return `${amount} créditos / mes`;
      return `${amount} créditos`;
    }
    return 'Costo no disponible';
  };

  return (
    <Card className="flex flex-col justify-between transition-all hover:border-slate-300 hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <Badge variant={config.badgeVariant} className="flex items-center gap-1 text-[11px]">
            <Icon className="h-3 w-3" />
            {config.label}
          </Badge>
          <span className="flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
            <Coins className="h-3.5 w-3.5" />
            {formatCost()}
          </span>
        </div>
        <CardTitle className="text-lg font-bold text-slate-900 mt-2 leading-snug">
          {resource.name}
        </CardTitle>
        <CardDescription className="text-xs text-slate-500 flex items-center gap-1">
          <Users className="h-3.5 w-3.5 text-slate-400" />
          Capacidad: {resource.capacity} {resource.capacity === 1 ? 'persona' : 'personas'}
        </CardDescription>
      </CardHeader>

      <CardContent className="text-xs text-slate-600 pb-4">
        <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-100 space-y-1">
          <div className="flex justify-between text-slate-500">
            <span>Fracción mínima:</span>
            <span className="font-semibold text-slate-700">{resource.creditCost.minBlockMinutes} min</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>Disponibilidad:</span>
            <span className="font-semibold text-emerald-700">En tiempo real (30 min)</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex flex-col gap-2 pt-0">
        <Link to={`/catalog/resource/${resource.id}`} className="w-full">
          <Button className="w-full text-xs font-semibold gap-1.5" size="sm">
            <CalendarCheck className="h-4 w-4" />
            Consultar Disponibilidad Horaria
          </Button>
        </Link>

        {isAdmin && onOpenAdminBlock && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenAdminBlock(resource)}
            className="w-full text-xs text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200"
          >
            <ShieldAlert className="h-3.5 w-3.5 mr-1" />
            Bloquear por Mantenimiento
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};
