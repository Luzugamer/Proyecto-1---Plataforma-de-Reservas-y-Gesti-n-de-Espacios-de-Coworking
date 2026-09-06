import React from 'react';
import { ResourceType } from '../types';
import { Users, Laptop, Briefcase, LayoutGrid } from 'lucide-react';
import { cn } from '@/shared/utils/cn';

interface ResourceTypeTabsProps {
  selectedType: ResourceType | 'ALL';
  onSelectType: (type: ResourceType | 'ALL') => void;
}

interface TabOption {
  id: ResourceType | 'ALL';
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const tabs: TabOption[] = [
  { id: 'ALL', label: 'Todos los Espacios', icon: LayoutGrid },
  { id: 'MEETING_ROOM', label: 'Salas de Reuniones', icon: Users },
  { id: 'HOT_DESK', label: 'Puestos Flexibles (Hot Desk)', icon: Laptop },
  { id: 'DEDICATED_DESK', label: 'Escritorios Dedicados', icon: Briefcase },
];

export const ResourceTypeTabs: React.FC<ResourceTypeTabsProps> = ({
  selectedType,
  onSelectType,
}) => {
  return (
    <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isSelected = selectedType === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onSelectType(tab.id)}
            className={cn(
              'flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs md:text-sm font-semibold transition-all',
              isSelected
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
            )}
          >
            <Icon className={cn('h-4 w-4', isSelected ? 'text-white' : 'text-slate-500')} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};
