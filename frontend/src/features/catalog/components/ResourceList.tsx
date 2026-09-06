import React from 'react';
import { Resource } from '../types';
import { ResourceCard } from './ResourceCard';
import { AlertCircle } from 'lucide-react';

interface ResourceListProps {
  resources: Resource[];
  isLoading: boolean;
  onOpenAdminBlock?: (resource: Resource) => void;
}

export const ResourceList: React.FC<ResourceListProps> = ({
  resources,
  isLoading,
  onOpenAdminBlock,
}) => {
  const safeResources = Array.isArray(resources) ? resources : [];

  if (isLoading) {
    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className="h-64 rounded-xl border border-slate-200 bg-white p-6 shadow-sm animate-pulse space-y-4"
          >
            <div className="h-4 w-1/3 bg-slate-200 rounded"></div>
            <div className="h-6 w-3/4 bg-slate-200 rounded"></div>
            <div className="h-4 w-1/2 bg-slate-200 rounded"></div>
            <div className="h-20 bg-slate-100 rounded-lg"></div>
            <div className="h-9 bg-slate-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (safeResources.length === 0) {
    return (
      <div className="flex min-h-[260px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h3 className="text-base font-bold text-slate-800">No se encontraron espacios</h3>
        <p className="mt-1 text-xs text-slate-500 max-w-sm">
          No hay recursos configurados para esta sede y filtro de categoría. Prueba seleccionando otra categoría o sede.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {safeResources.map((resource) => (
        <ResourceCard
          key={resource.id}
          resource={resource}
          onOpenAdminBlock={onOpenAdminBlock}
        />
      ))}
    </div>
  );
};
