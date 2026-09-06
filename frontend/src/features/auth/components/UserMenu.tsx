import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useLogout } from '../hooks/useLogout';
import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import { LogOut, User as UserIcon } from 'lucide-react';
import { UserRole } from '@/shared/types/user';

const roleBadgeVariant: Record<UserRole, 'member' | 'admin' | 'receptionist'> = {
  MEMBER: 'member',
  SITE_ADMIN: 'admin',
  RECEPTIONIST: 'receptionist',
};

const roleLabel: Record<UserRole, string> = {
  MEMBER: 'Miembro',
  SITE_ADMIN: 'Administrador de Sede',
  RECEPTIONIST: 'Recepción',
};

export const UserMenu: React.FC = () => {
  const { user } = useAuth();
  const { mutate: logout, isPending } = useLogout();
  const navigate = useNavigate();

  if (!user) return null;

  const handleLogout = () => {
    logout(undefined, {
      onSuccess: () => {
        navigate('/login', { replace: true });
      },
    });
  };

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
        {initials || <UserIcon className="h-4 w-4" />}
      </div>

      <div className="flex flex-col text-left text-xs">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-slate-900">{user.name}</span>
          <Badge variant={roleBadgeVariant[user.role]}>
            {roleLabel[user.role]}
          </Badge>
        </div>
        <span className="text-slate-500">{user.email}</span>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={handleLogout}
        isLoading={isPending}
        className="text-slate-600 hover:text-red-600 hover:bg-red-50 ml-2"
        title="Cerrar Sesión"
      >
        <LogOut className="h-4 w-4 mr-1" />
        <span className="text-xs">Salir</span>
      </Button>
    </div>
  );
};
