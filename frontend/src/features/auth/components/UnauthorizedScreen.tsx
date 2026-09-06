import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { ShieldX, ArrowLeft, Home } from 'lucide-react';

export const UnauthorizedScreen: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleGoToHome = () => {
    if (user?.role === 'SITE_ADMIN' || user?.role === 'RECEPTIONIST') {
      navigate('/admin');
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center p-4">
      <Card className="w-full max-w-md text-center border-red-100 shadow-md">
        <CardHeader className="space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600">
            <ShieldX className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl text-slate-900">Acceso No Autorizado</CardTitle>
          <CardDescription>
            Tu rol actual ({user?.role || 'Visitante'}) no cuenta con los permisos necesarios para acceder a este recurso.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <p className="text-sm text-slate-600">
            Si consideras que deberías tener acceso a este módulo administrativo o de recepción, contacta con el administrador del sistema.
          </p>
        </CardContent>

        <CardFooter className="flex flex-col gap-2 sm:flex-row justify-center">
          <Button variant="outline" onClick={() => navigate(-1)} className="w-full sm:w-auto">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <Button onClick={handleGoToHome} className="w-full sm:w-auto">
            <Home className="h-4 w-4 mr-2" />
            Ir a mi Área Principal
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};
