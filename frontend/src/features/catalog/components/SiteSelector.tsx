import React from 'react';
import { Site } from '../types';
import { MapPin, Clock } from 'lucide-react';

interface SiteSelectorProps {
  sites: Site[];
  selectedSiteId: string;
  onSelectSite: (siteId: string) => void;
  isLoading?: boolean;
}

export const SiteSelector: React.FC<SiteSelectorProps> = ({
  sites,
  selectedSiteId,
  onSelectSite,
  isLoading,
}) => {
  const selectedSite = sites.find((s) => s.id === selectedSiteId);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <label htmlFor="site-select" className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Sede Operativa
          </label>
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-600 shrink-0" />
            <select
              id="site-select"
              value={selectedSiteId}
              onChange={(e) => onSelectSite(e.target.value)}
              disabled={isLoading}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm transition-all focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 disabled:cursor-not-allowed"
            >
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedSite && (
          <div className="flex flex-col text-xs text-slate-600 md:text-right">
            <span className="font-medium text-slate-700">{selectedSite.address}</span>
            <div className="flex items-center gap-1.5 md:justify-end text-slate-500 mt-0.5">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              <span>
                Horario: {selectedSite.openingTime || selectedSite.operatingHours?.[0]?.opensAt || '08:00'} a{' '}
                {selectedSite.closingTime || selectedSite.operatingHours?.[0]?.closesAt || '22:00'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
