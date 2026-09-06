import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { UserMenu } from '@/features/auth/components/UserMenu';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Alert, AlertTitle, AlertDescription } from '@/shared/components/ui/Alert';
import { ShieldCheck, Building2, Users } from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="sticky top-0 z-10 border-b border-purple-200 bg-white px-6 py-3 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-700 text-white font-bold">
              A
            </div>
            <span className="text-xl font-black text-slate-900">
              COWORK<span className="text-purple-700">ADMIN</span>
            </span>
          </div>
          <UserMenu />
        </div>
      </header>

      <main className="mx-auto max-w-7xl flex-1 p-6 w-full space-y-6">
        <Alert variant="info" className="border-purple-200 bg-purple-50 text-purple-900">
          <ShieldCheck className="h-4 w-4 text-purple-700" />
          <AlertTitle>Panel de Operaciones de Sede</AlertTitle>
          <AlertDescription>
            Sesión iniciada con privilegios de {user?.role === 'SITE_ADMIN' ? 'Administrador de Sede' : 'Recepción'}.
          </AlertDescription>
        </Alert>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gestión de Sedes y Espacios</CardTitle>
              <Building2 className="h-4 w-4 text-purple-700" />
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-2xl font-bold">2 Sedes Activas</div>
                <p className="text-xs text-slate-500">Módulos de bloqueo por mantenimiento (HU-02)</p>
              </div>
              <Link to="/catalog">
                <Button size="sm" variant="outline" className="w-full text-xs text-purple-800 border-purple-200 hover:bg-purple-50">
                  Ver Espacios y Bloqueos de Sede
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Check-in de Usuarios</CardTitle>
              <Users className="h-4 w-4 text-purple-700" />
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-2xl font-bold">Recepción Activa</div>
                <p className="text-xs text-slate-500">Validación de tolerancias ±15 min (HU-06)</p>
              </div>
              <Link to="/admin/checkin">
                <Button size="sm" variant="outline" className="w-full text-xs text-purple-800 border-purple-200 hover:bg-purple-50">
                  Abrir Mostrador de Recepción
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};
