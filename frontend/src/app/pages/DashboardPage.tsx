import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { UserMenu } from '@/features/auth/components/UserMenu';
import { CreditsBalanceBadge } from '@/features/reservations/components/CreditsBalanceBadge';
import { useWalletBalance } from '@/features/reservations/hooks/useWalletBalance';
import { useReservations } from '@/features/lifecycle/hooks/useReservations';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Alert, AlertTitle, AlertDescription } from '@/shared/components/ui/Alert';
import { CheckCircle2, LayoutDashboard, Calendar, CreditCard, Clock } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const { data: wallet } = useWalletBalance();
  const { data: reservations } = useReservations();
  const successMessage = (location.state as { message?: string })?.message;

  const activeReservationsCount = (reservations?.items ?? []).filter(
    (r) => r.status === 'CONFIRMED' || r.status === 'CHECKED_IN'
  ).length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header con UserMenu */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white px-6 py-3 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white font-bold">
              C
            </div>
            <span className="text-xl font-black text-slate-900">
              COWORK<span className="text-blue-600">HUB</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <CreditsBalanceBadge />
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl flex-1 p-6 w-full space-y-6">
        {successMessage ? (
          <Alert variant="success">
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>¡Sesión iniciada con éxito!</AlertTitle>
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        ) : (
          <Alert variant="info">
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Sesión activa verificada</AlertTitle>
            <AlertDescription>
              Has ingresado correctamente como miembro. Tu token de acceso está protegido en memoria.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Bolsa de Créditos</CardTitle>
              <CreditCard className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-2xl font-bold text-amber-900">
                  {wallet?.availableCredits ?? 10} créditos
                </div>
                <p className="text-xs text-slate-500">Saldo mensual disponible</p>
              </div>
              <Link to="/membership">
                <Button size="sm" variant="outline" className="w-full text-xs">
                  Gestionar billetera y recargas
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Reservas Activas</CardTitle>
              <Calendar className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-2xl font-bold">{activeReservationsCount}</div>
                <p className="text-xs text-slate-500">
                  {activeReservationsCount === 1 ? '1 reserva activa' : `${activeReservationsCount} reservas activas`}
                </p>
              </div>
              <Link to="/reservations">
                <Button size="sm" variant="outline" className="w-full text-xs">
                  Ver mis reservas
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Estado de Membresía</CardTitle>
              <Clock className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-2xl font-bold text-emerald-600">Activa</div>
                <p className="text-xs text-slate-500">Rol: {user?.role}</p>
              </div>
              <Link to="/membership">
                <Button size="sm" variant="outline" className="w-full text-xs">
                  Ver planes y beneficios
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LayoutDashboard className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-lg text-blue-950">Explorar Espacios y Disponibilidad</CardTitle>
              </div>
              <Link to="/catalog">
                <Button size="sm" className="text-xs">
                  Ir al Catálogo
                </Button>
              </Link>
            </div>
            <CardDescription className="text-blue-700">
              Consulta en tiempo real la disponibilidad de salas de reuniones, escritorios dedicados y puestos hot desk en todas las sedes.
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    </div>
  );
};
