import React, { useState } from 'react';
import { Reservation } from '../types';
import { ReservationCard } from './ReservationCard';
import { cn } from '@/shared/utils/cn';
import { Calendar, History, ListFilter, AlertCircle } from 'lucide-react';

interface MyReservationsListProps {
  reservations: Reservation[];
  isLoading: boolean;
  onOpenCancel: (reservation: Reservation) => void;
}

type TabKey = 'ACTIVE' | 'HISTORY' | 'ALL';

export const MyReservationsList: React.FC<MyReservationsListProps> = ({
  reservations,
  isLoading,
  onOpenCancel,
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>('ACTIVE');
  const [searchQuery, setSearchQuery] = useState('');

  const filterByTab = (item: Reservation) => {
    if (activeTab === 'ACTIVE') {
      return item.status === 'CONFIRMED' || item.status === 'CHECKED_IN';
    }
    if (activeTab === 'HISTORY') {
      return item.status === 'COMPLETED' || item.status === 'CANCELLED' || item.status === 'NO_SHOW';
    }
    return true;
  };

  const filteredItems = reservations
    .filter(filterByTab)
    .filter((item) => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return (
        item.id.toLowerCase().includes(query) ||
        (item.resourceName && item.resourceName.toLowerCase().includes(query)) ||
        (item.siteName && item.siteName.toLowerCase().includes(query))
      );
    });

  const countActive = reservations.filter((r) => r.status === 'CONFIRMED' || r.status === 'CHECKED_IN').length;
  const countHistory = reservations.filter((r) => r.status === 'COMPLETED' || r.status === 'CANCELLED' || r.status === 'NO_SHOW').length;

  return (
    <div className="space-y-5">
      {/* Pestañas de Navegación Rápida */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-3">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('ACTIVE')}
            className={cn(
              'flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs sm:text-sm font-semibold transition-all',
              activeTab === 'ACTIVE'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            <Calendar className="h-4 w-4" />
            <span>Activas y Próximas ({countActive})</span>
          </button>

          <button
            onClick={() => setActiveTab('HISTORY')}
            className={cn(
              'flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs sm:text-sm font-semibold transition-all',
              activeTab === 'HISTORY'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            <History className="h-4 w-4" />
            <span>Historial ({countHistory})</span>
          </button>

          <button
            onClick={() => setActiveTab('ALL')}
            className={cn(
              'flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs sm:text-sm font-semibold transition-all',
              activeTab === 'ALL'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            <ListFilter className="h-4 w-4" />
            <span>Todas ({reservations.length})</span>
          </button>
        </div>

        <input
          type="text"
          placeholder="Buscar por código o sala..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-9 w-full sm:w-64 rounded-md border border-slate-300 bg-white px-3 py-1 text-xs text-slate-800 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
        />
      </div>

      {/* Grid de Reservas */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-56 rounded-xl border border-slate-200 bg-white p-5 animate-pulse space-y-3">
              <div className="h-5 w-24 bg-slate-200 rounded"></div>
              <div className="h-6 w-3/4 bg-slate-200 rounded"></div>
              <div className="h-24 bg-slate-100 rounded-lg"></div>
              <div className="h-8 bg-slate-200 rounded"></div>
            </div>
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex min-h-[260px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No hay reservas en esta categoría</h3>
          <p className="mt-1 text-xs text-slate-500 max-w-sm">
            {activeTab === 'ACTIVE'
              ? 'No tienes reservas activas en este momento. Explora el catálogo para reservar una sala o escritorio.'
              : 'No se encontraron registros para los filtros seleccionados.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((reservation) => (
            <ReservationCard
              key={reservation.id}
              reservation={reservation}
              onOpenCancel={onOpenCancel}
            />
          ))}
        </div>
      )}
    </div>
  );
};
