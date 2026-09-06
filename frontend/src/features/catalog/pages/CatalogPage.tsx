import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSites } from '../hooks/useSites';
import { useResources } from '../hooks/useResources';
import { ResourceType, Resource } from '../types';
import { SiteSelector } from '../components/SiteSelector';
import { ResourceTypeTabs } from '../components/ResourceTypeTabs';
import { ResourceList } from '../components/ResourceList';
import { AdminBlockModal } from '../components/AdminBlockModal';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { UserMenu } from '@/features/auth/components/UserMenu';
import { CreditsBalanceBadge } from '@/features/reservations/components/CreditsBalanceBadge';
import { Button } from '@/shared/components/ui/Button';
import { Alert, AlertTitle, AlertDescription } from '@/shared/components/ui/Alert';
import { LogIn, UserPlus, AlertTriangle } from 'lucide-react';

export const CatalogPage: React.FC = () => {
  const { isAuthenticated } = useAuth();

  const { data: sites = [], isLoading: isLoadingSites, error: sitesError } = useSites();
  const [selectedSiteId, setSelectedSiteId] = useState<string>('site_01');
  const [selectedType, setSelectedType] = useState<ResourceType | 'ALL'>('ALL');

  const [blockingResource, setBlockingResource] = useState<Resource | null>(null);

  // Auto-seleccionar primera sede al cargar si no está seleccionada
  React.useEffect(() => {
    if (sites.length > 0 && !sites.some((s) => s.id === selectedSiteId)) {
      setSelectedSiteId(sites[0].id);
    }
  }, [sites, selectedSiteId]);

  const {
    data: resources = [],
    isLoading: isLoadingResources,
    error: resourcesError,
  } = useResources(
    selectedSiteId,
    selectedType === 'ALL' ? undefined : selectedType
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Navbar Superior */}
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
                <Link to="/dashboard" className="text-xs font-semibold text-slate-600 hover:text-blue-600 hidden sm:inline">
                  Mi Panel
                </Link>
                <UserMenu />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login">
                  <Button variant="outline" size="sm" className="text-xs gap-1">
                    <LogIn className="h-3.5 w-3.5" />
                    Iniciar Sesión
                  </Button>
                </Link>
                <Link to="/register">
                  <Button size="sm" className="text-xs gap-1 bg-emerald-600 hover:bg-emerald-700">
                    <UserPlus className="h-3.5 w-3.5" />
                    Registrarse
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero / Encabezado del Catálogo */}
      <div className="border-b border-slate-200 bg-white py-8 px-6 shadow-sm">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Catálogo de Espacios y Salas de Reunión
          </h1>
          <p className="mt-1 text-sm text-slate-500 max-w-2xl">
            Explora nuestros puestos flexibles, escritorios dedicados y salas de trabajo en tiempo real. Selecciona una sede para ver los recursos disponibles.
          </p>
        </div>
      </div>

      {/* Contenedor Principal */}
      <main className="mx-auto max-w-7xl flex-1 p-6 w-full space-y-6">
        {sitesError && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error al cargar sedes</AlertTitle>
            <AlertDescription>{sitesError.message}</AlertDescription>
          </Alert>
        )}

        {/* Selector de Sede */}
        <SiteSelector
          sites={sites}
          selectedSiteId={selectedSiteId}
          onSelectSite={setSelectedSiteId}
          isLoading={isLoadingSites}
        />

        {/* Filtro por Categorías / Tabs */}
        <ResourceTypeTabs
          selectedType={selectedType}
          onSelectType={setSelectedType}
        />

        {resourcesError && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error al cargar recursos</AlertTitle>
            <AlertDescription>{resourcesError.message}</AlertDescription>
          </Alert>
        )}

        {/* Grilla de Recursos */}
        <ResourceList
          resources={resources}
          isLoading={isLoadingResources}
          onOpenAdminBlock={(res) => setBlockingResource(res)}
        />
      </main>

      {/* Modal de Bloqueo Administrativo */}
      {blockingResource && (
        <AdminBlockModal
          resource={blockingResource}
          onClose={() => setBlockingResource(null)}
        />
      )}
    </div>
  );
};
