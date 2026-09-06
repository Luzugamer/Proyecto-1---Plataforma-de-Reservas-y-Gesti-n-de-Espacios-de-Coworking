import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useReservations } from '../hooks/useReservations';
import { Reservation } from '../types';
import { MyReservationsList } from '../components/MyReservationsList';
import { CancelReservationDialog } from '../components/CancelReservationDialog';
import { UserMenu } from '@/features/auth/components/UserMenu';
import { CreditsBalanceBadge } from '@/features/reservations/components/CreditsBalanceBadge';
import { Button } from '@/shared/components/ui/Button';
import { ArrowLeft, Plus } from 'lucide-react';

export const MyReservationsPage: React.FC = () => {
  const { data: reservationsData, isLoading, refetch } = useReservations();
  const [cancellingReservation, setCancellingReservation] = useState<Reservation | null>(null);

  const reservations = reservationsData?.items || [];

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
            <CreditsBalanceBadge />
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="border-b border-slate-200 bg-white py-6 px-6 shadow-sm">
        <div className="mx-auto max-w-7xl flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <Link to="/dashboard" className="hover:text-blue-600 flex items-center gap-1">
                <ArrowLeft className="h-3.5 w-3.5" />
                Mi Panel
              </Link>
              <span>/</span>
              <span className="font-semibold text-slate-700">Mis Reservas</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Mis Reservas y Ciclo de Vida
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Gestiona tus asistencias, revisa tus horarios y cancela con reembolso escalado si tus planes cambian.
            </p>
          </div>

          <Link to="/catalog">
            <Button size="sm" className="text-xs gap-1.5 font-bold bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4" />
              Nueva Reserva
            </Button>
          </Link>
        </div>
      </div>

      {/* Contenido */}
      <main className="mx-auto max-w-7xl flex-1 p-6 w-full space-y-6">
        <MyReservationsList
          reservations={reservations}
          isLoading={isLoading}
          onOpenCancel={(resv) => setCancellingReservation(resv)}
        />
      </main>

      {/* Modal de Cancelación con Reembolso */}
      {cancellingReservation && (
        <CancelReservationDialog
          reservation={cancellingReservation}
          onClose={() => setCancellingReservation(null)}
          onCancelled={() => {
            refetch();
          }}
        />
      )}
    </div>
  );
};
