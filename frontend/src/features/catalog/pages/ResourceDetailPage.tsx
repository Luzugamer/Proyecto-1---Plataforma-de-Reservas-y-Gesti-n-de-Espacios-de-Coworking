import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSites } from '../hooks/useSites';
import { useResources } from '../hooks/useResources';
import { AvailabilitySlot } from '../types';
import { AvailabilityCalendar } from '../components/AvailabilityCalendar';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { UserMenu } from '@/features/auth/components/UserMenu';
import { CreditsBalanceBadge } from '@/features/reservations/components/CreditsBalanceBadge';
import { SlotCheckoutDrawer } from '@/features/reservations/components/SlotCheckoutDrawer';
import { ReservationSuccessModal } from '@/features/reservations/components/ReservationSuccessModal';
import { AuthRequiredModal } from '@/features/reservations/components/AuthRequiredModal';
import { useCreateHold } from '@/features/reservations/hooks/useCreateHold';
import { HoldResponse, ReservationResponse } from '@/features/reservations/types';
import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import { ArrowLeft, Users, Coins, MapPin, LogIn, UserPlus, CheckCircle2 } from 'lucide-react';

export const ResourceDetailPage: React.FC = () => {
  const { resourceId } = useParams<{ resourceId: string }>();
  const { isAuthenticated } = useAuth();

  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedSlots, setSelectedSlots] = useState<AvailabilitySlot[]>([]);

  // Estados de checkout y modales
  const [currentHold, setCurrentHold] = useState<HoldResponse | null>(null);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [confirmedReservation, setConfirmedReservation] = useState<ReservationResponse | null>(null);

  const { data: sites = [] } = useSites();
  const { data: allResources = [] } = useResources('site_01');
  const { data: site2Resources = [] } = useResources('site_02');

  const combinedResources = [...allResources, ...site2Resources];
  const resource = combinedResources.find((r) => r.id === resourceId) || {
    id: resourceId || 'res_01',
    siteId: 'site_01',
    type: 'MEETING_ROOM' as const,
    name: 'Espacio Seleccionado',
    capacity: 6,
    creditCost: { amount: 2, unit: 'HOUR' as const, minBlockMinutes: 30 },
  };

  const site = sites.find((s) => s.id === resource.siteId);

  const { mutate: createHold, isPending: isCreatingHold } = useCreateHold();

  const handleToggleSlot = (slot: AvailabilitySlot) => {
    setSelectedSlots((prev) => {
      const exists = prev.some((s) => s.startsAt === slot.startsAt && s.endsAt === slot.endsAt);
      if (exists) {
        return prev.filter((s) => s.startsAt !== slot.startsAt || s.endsAt !== slot.endsAt);
      } else {
        return [...prev, slot];
      }
    });
  };

  const handleStartHold = () => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }

    if (selectedSlots.length === 0) return;

    // Ordenar slots seleccionados para extraer startsAt inicial y endsAt final
    const sorted = [...selectedSlots].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    const startsAt = sorted[0].startsAt;
    const endsAt = sorted[sorted.length - 1].endsAt;

    createHold(
      {
        resourceId: resource.id,
        startsAt,
        endsAt,
      },
      {
        onSuccess: (data) => {
          setCurrentHold(data);
          setSelectedSlots([]); // Limpiar selección previa
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white px-6 py-3 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white font-bold">
              C
            </div>
            <span className="text-xl font-black text-slate-900 tracking-tight">
              COWORK<span className="text-blue-600">HUB</span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <CreditsBalanceBadge />
                <UserMenu />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login">
                  <Button variant="outline" size="sm" className="text-xs">
                    <LogIn className="h-3.5 w-3.5 mr-1" />
                    Iniciar Sesión
                  </Button>
                </Link>
                <Link to="/register">
                  <Button size="sm" className="text-xs bg-emerald-600 hover:bg-emerald-700">
                    <UserPlus className="h-3.5 w-3.5 mr-1" />
                    Registrarse
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl flex-1 p-6 w-full space-y-6">
        {/* Botón Volver */}
        <div>
          <Link to="/catalog">
            <Button variant="ghost" size="sm" className="text-xs text-slate-600 hover:text-slate-900">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Volver al Catálogo de Espacios
            </Button>
          </Link>
        </div>

        {/* Ficha Resumen del Recurso */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="default" className="text-xs">
                  {resource.type}
                </Badge>
                {site && (
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    {site.name} ({site.address})
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-black text-slate-900">{resource.name}</h1>
              <div className="flex items-center gap-4 text-xs text-slate-600 pt-1">
                <span className="flex items-center gap-1 font-medium">
                  <Users className="h-4 w-4 text-slate-400" />
                  Capacidad: {resource.capacity} {resource.capacity === 1 ? 'persona' : 'personas'}
                </span>
                <span className="flex items-center gap-1 font-bold text-blue-700">
                  <Coins className="h-4 w-4 text-blue-600" />
                  {resource.creditCost.amount} créditos / {resource.creditCost.unit.toLowerCase()}
                </span>
              </div>
            </div>

            {selectedSlots.length > 0 && (
              <div className="rounded-xl bg-blue-50 p-4 border border-blue-200 text-xs space-y-2 text-right">
                <div className="flex items-center justify-between gap-4">
                  <span className="font-bold text-blue-950">
                    {selectedSlots.length} {selectedSlots.length === 1 ? 'slot seleccionado' : 'slots seleccionados'}
                  </span>
                  <span className="font-black text-blue-800 text-sm">
                    {selectedSlots.length * (resource.creditCost.amount / 2)} créditos
                  </span>
                </div>
                <Button
                  onClick={handleStartHold}
                  isLoading={isCreatingHold}
                  className="w-full text-xs font-bold gap-1.5 bg-blue-600 hover:bg-blue-700"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Retener y Proceder al Checkout (Hold 5 min)
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Calendario de Disponibilidad Horaria */}
        <AvailabilityCalendar
          resourceId={resource.id}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          selectedSlots={selectedSlots}
          onToggleSlot={handleToggleSlot}
        />
      </main>

      {/* Drawer de Checkout con Hold de 5 min */}
      {currentHold && (
        <SlotCheckoutDrawer
          hold={currentHold}
          resource={resource}
          onClose={() => setCurrentHold(null)}
          onReservationSuccess={(resv) => {
            setCurrentHold(null);
            setConfirmedReservation(resv);
          }}
        />
      )}

      {/* Modal de Reserva Confirmada */}
      {confirmedReservation && (
        <ReservationSuccessModal
          reservation={confirmedReservation}
          resource={resource}
          onClose={() => setConfirmedReservation(null)}
        />
      )}

      {/* Modal para Visitantes no Autenticados */}
      {showAuthModal && <AuthRequiredModal onClose={() => setShowAuthModal(false)} />}
    </div>
  );
};
