import { NavLink } from 'react-router-dom';
import {
  ClipboardList,
  FileBarChart,
  LayoutDashboard,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

const adminItems: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Empleados', path: '/empleados', icon: Users },
  { label: 'Horarios', path: '/horarios', icon: ClipboardList },
  { label: 'Nómina', path: '/nomina', icon: Wallet },
  { label: 'Reportes', path: '/reportes', icon: FileBarChart },
];

const employeeItems: NavItem[] = [
  { label: 'Mi Panel', path: '/mi-panel', icon: LayoutDashboard },
  { label: 'Mis Registros', path: '/mis-registros', icon: ClipboardList },
  { label: 'Mi Salario', path: '/mi-salario', icon: Wallet },
];

const Sidebar = ({ onNavigate }: { onNavigate?: () => void }) => {
  const { user } = useAuth();
  const items = user?.role === 'ADMIN' ? adminItems : employeeItems;

  return (
    <aside className="flex h-full w-64 flex-col border-r border-slate-200 bg-white">
      <div className="flex h-16 items-center gap-2 border-b border-slate-100 px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
          <Users size={18} />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-900">RRHH Empresa</p>
          <p className="text-[11px] text-slate-500">Gestión y nómina</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
        <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Menú
        </p>
        {items.map(({ label, path, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
                isActive
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`
            }
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-slate-100 p-4">
        <p className="text-[11px] text-slate-400">NóminaMX · Fase 3 de 3</p>
      </div>
    </aside>
  );
};

export default Sidebar;
