import React from 'react';
import { Link } from 'react-router-dom';
import { useReservations } from '../hooks/useReservations';
import { ReceptionCheckinView } from '../components/ReceptionCheckinView';
import { UserMenu } from '@/features/auth/components/UserMenu';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

export const ReceptionPage: React.FC = () => {
  const { data: reservationsData, isLoading } = useReservations();
  const reservations = reservationsData?.items || [];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-purple-200 bg-white px-6 py-3 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-700 text-white font-bold">
              R
            </div>
            <span className="text-xl font-black text-slate-900 tracking-tight">
              COWORK<span className="text-purple-700">RECEPCIÓN</span>
            </span>
          </div>

          <UserMenu />
        </div>
      </header>

      {/* Hero */}
      <div className="border-b border-slate-200 bg-white py-6 px-6 shadow-sm">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link to="/admin" className="hover:text-purple-700 flex items-center gap-1">
              <ArrowLeft className="h-3.5 w-3.5" />
              Panel de Administración
            </Link>
            <span>/</span>
            <span className="font-semibold text-slate-700">Check-in de Miembros</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-purple-700" />
            Control de Asistencia y Check-in de Sede
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Valida el acceso de miembros que llegan a sus reservas del día. Las reservas no presentadas transicionan a No-Show automáticamente.
          </p>
        </div>
      </div>

      {/* Contenido */}
      <main className="mx-auto max-w-7xl flex-1 p-6 w-full space-y-6">
        <ReceptionCheckinView reservations={reservations} isLoading={isLoading} />
      </main>
    </div>
  );
};
