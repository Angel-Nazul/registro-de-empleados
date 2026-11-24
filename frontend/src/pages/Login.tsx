import { useState, type FormEvent } from 'react';
import axios from 'axios';
import { Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, UserRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const demoAccounts = [
  {
    label: 'Administrador',
    email: 'admin@empresa.mx',
    password: 'Admin123!',
    icon: ShieldCheck,
  },
  {
    label: 'Empleado',
    email: 'juan.perez@empresa.mx',
    password: 'Empleado123!',
    icon: UserRound,
  },
];

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email.trim()) {
      toast.error('Ingresa tu correo electrónico');
      return;
    }
    if (!emailPattern.test(email.trim())) {
      toast.error('El correo no tiene un formato válido');
      return;
    }
    if (!password) {
      toast.error('Ingresa tu contraseña');
      return;
    }

    setSubmitting(true);
    try {
      const user = await login(email.trim(), password);
      toast.success(`Bienvenido, ${user.role === 'ADMIN' ? 'administrador' : 'empleado'}`);
      navigate(user.role === 'ADMIN' ? '/dashboard' : '/mi-panel', { replace: true });
    } catch (error) {
      // Axios expone el mensaje del backend en response.data.message.
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message ?? 'No se pudo iniciar sesión'
        : 'No se pudo conectar con el servidor';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemo = (account: (typeof demoAccounts)[number]) => {
    setEmail(account.email);
    setPassword(account.password);
  };

  return (
    <div className="flex min-h-screen bg-white">
      {/* Panel lateral */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-brand-600 px-12 py-14 text-white lg:flex">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-brand-700/60" />

        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
            <UserRound size={22} />
          </div>
          <div>
            <p className="text-lg font-bold">RRHH Empresa</p>
            <p className="text-sm text-brand-100">Control de personal y nómina</p>
          </div>
        </div>

        <div className="relative max-w-md">
          <h1 className="text-4xl font-bold leading-tight">
            Gestiona tu equipo con precisión
          </h1>
          <p className="mt-5 text-brand-100">
            Registro de empleados, control de horarios y cálculo de nómina en un solo lugar.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 text-sm">
            <span className="rounded-full bg-white/15 px-4 py-2"> México</span>
            <span className="rounded-full bg-white/15 px-4 py-2">Pesos MXN</span>
            <span className="rounded-full bg-white/15 px-4 py-2">Zona Centro</span>
          </div>
        </div>

        <p className="relative text-xs text-brand-100">Fase 1 de 3 · Acceso y seguridad</p>
      </div>

      {/* Formulario */}
      <div className="flex w-full flex-col justify-center px-6 py-12 sm:px-12 lg:w-1/2">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-white">
              <UserRound size={22} />
            </div>
          </div>

          <h2 className="text-3xl font-bold text-slate-900">Iniciar sesión</h2>
          <p className="mt-2 text-sm text-slate-500">
            Ingresa tus credenciales para continuar al panel.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
                Correo electrónico
              </label>
              <div className="relative">
                <Mail
                  size={18}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="nombre@empresa.mx"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 py-3 pl-10 pr-3 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">
                Contraseña
              </label>
              <div className="relative">
                <LockKeyhole
                  size={18}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 py-3 pl-10 pr-12 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-brand-600 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Verificando...' : 'Entrar al sistema'}
            </button>
          </form>

          <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-semibold text-slate-800">Credenciales de prueba</p>
            <p className="mt-1 text-xs text-slate-500">Haz clic para llenar el formulario.</p>

            <div className="mt-4 space-y-3">
              {demoAccounts.map((account) => {
                const Icon = account.icon;
                return (
                  <button
                    key={account.email}
                    type="button"
                    onClick={() => fillDemo(account)}
                    className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-3 text-left hover:border-brand-600"
                  >
                    <span className="flex items-center gap-2">
                      <Icon size={16} className="text-brand-600" />
                      <span>
                        <span className="block text-xs font-semibold text-slate-800">
                          {account.label}
                        </span>
                        <span className="block text-xs text-slate-500">{account.email}</span>
                      </span>
                    </span>
                    <span className="hidden text-xs text-slate-400 sm:block">
                      {account.password}
                    </span>
                  </button>
                );
              })}
            </div>

            <p className="mt-4 text-[11px] text-slate-400">
              También disponibles: maria.lopez@empresa.mx y carlos.ramirez@empresa.mx
              (contraseña Empleado123!)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
