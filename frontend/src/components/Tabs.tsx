import type { LucideIcon } from 'lucide-react';

export interface TabItem {
  id: string;
  label: string;
  icon?: LucideIcon;
}

interface TabsProps {
  tabs: TabItem[];
  active: string;
  onChange: (id: string) => void;
}

const Tabs = ({ tabs, active, onChange }: TabsProps) => (
  <div
    role="tablist"
    aria-label="Secciones del panel"
    className="flex gap-1 overflow-x-auto border-b border-slate-200"
  >
    {tabs.map(({ id, label, icon: Icon }) => {
      const selected = id === active;
      return (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={selected}
          onClick={() => onChange(id)}
          className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
            selected
              ? 'border-brand-600 text-brand-700'
              : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'
          }`}
        >
          {Icon && <Icon size={16} />}
          {label}
        </button>
      );
    })}
  </div>
);

export default Tabs;
