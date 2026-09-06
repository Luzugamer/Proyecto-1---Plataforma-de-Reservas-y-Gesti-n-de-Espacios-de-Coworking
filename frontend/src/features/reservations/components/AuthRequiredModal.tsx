import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { LogIn, UserPlus, X, Lock } from 'lucide-react';

interface AuthRequiredModalProps {
  onClose: () => void;
}

export const AuthRequiredModal: React.FC<AuthRequiredModalProps> = ({ onClose }) => {
  const location = useLocation();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in">
      <Card className="w-full max-w-md shadow-2xl border-slate-200 bg-white text-center">
        <CardHeader className="flex flex-row items-start justify-between pb-2">
          <div className="w-full space-y-1">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600">
              <Lock className="h-6 w-6" />
            </div>
            <CardTitle className="text-xl font-black text-slate-900">
              Inicia Sesión para Reservar
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Para retener un slot y confirmar tu reserva con créditos de membresía necesitas una cuenta activa.
            </CardDescription>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 rounded-md p-1 -mr-2 -mt-2"
          >
            <X className="h-5 w-5" />
          </button>
        </CardHeader>

        <CardContent className="space-y-3 pt-2 text-xs text-slate-600">
          <p>
            Puedes ingresar con tu cuenta de miembro existente o crear una nueva en menos de un minuto.
          </p>
        </CardContent>

        <CardFooter className="flex flex-col gap-2 pt-0">
          <Link to="/login" state={{ from: location }} className="w-full">
            <Button className="w-full text-xs font-bold gap-1">
              <LogIn className="h-4 w-4" />
              Iniciar Sesión
            </Button>
          </Link>
          <Link to="/register" state={{ from: location }} className="w-full">
            <Button variant="outline" className="w-full text-xs font-semibold gap-1">
              <UserPlus className="h-4 w-4" />
              Registrarse como Nuevo Miembro
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
};
