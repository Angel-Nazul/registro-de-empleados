import { useState } from 'react';
import { LogOut, Menu, ShieldCheck, UserRound } from 'lucide-react';
import { Outlet, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    toast.success('Sesión cerrada');
    navigate('/login', { replace: true });
  };

  const displayName = user?.employeeId ? 'Empleado' : 'Administrador';

  return (
    <div className="flex min-h-screen bg-slate-50">
      <div className="sticky top-0 hidden h-screen shrink-0 md:block">
        <Sidebar />
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <button
            type="button"
            aria-label="Cerrar menú"
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setMobileOpen(false)}
          />
          <div id="mobile-sidebar" className="relative z-50">
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
          <button
            type="button"
            aria-label="Abrir menú"
            aria-expanded={mobileOpen}
            aria-controls="mobile-sidebar"
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Menu size={20} />
          </button>

          <div className="ml-auto flex items-center gap-3 sm:gap-4">
            <div className="hidden text-right sm:block">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                {user?.employeeId ? <UserRound size={15} /> : <ShieldCheck size={15} />}
                {displayName}
              </p>
              <p className="text-xs text-slate-500">{user?.email}</p>
            </div>

            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                user?.role === 'ADMIN'
                  ? 'bg-brand-50 text-brand-700'
                  : 'bg-emerald-50 text-emerald-700'
              }`}
            >
              {user?.role === 'ADMIN' ? 'ADMIN' : 'EMPLEADO'}
            </span>

            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Cerrar sesión</span>
            </button>

          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
