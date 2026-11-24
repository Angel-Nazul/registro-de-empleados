import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Users,
  Wallet,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import toast from 'react-hot-toast';
import { getAdminDashboard } from '../api/dashboard';
import { Badge, OvertimeBadge, TardinessBadge } from '../components/Badge';
import EmptyState from '../components/EmptyState';
import { PageLoader, StatCardsSkeleton } from '../components/Skeleton';
import StatCard from '../components/StatCard';
import { errorMessage } from '../utils/errors';
import { formatCurrency, formatDate } from '../utils/formatters';
import { weekRangeLabel } from '../utils/week';
import type { AdminDashboard } from '../types';

const chartColors = { grid: '#e2e8f0', text: '#64748b', line: '#4f46e5', bar: '#6366f1' };

const Dashboard = () => {
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setData(await getAdminDashboard());
    } catch (error) {
      toast.error(errorMessage(error, 'No se pudo cargar el dashboard'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <StatCardsSkeleton />
        <PageLoader label="Calculando indicadores de la semana..." />
      </div>
    );
  }

  if (!data) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="No fue posible cargar el dashboard"
        description="Intenta recargar la página en unos segundos."
        action={
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Reintentar
          </button>
        }
      />
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Resumen general de la operación</p>
        </div>
        <p className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-500 ring-1 ring-slate-200">
          Semana {weekRangeLabel(data.weekStart)}
        </p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Empleados activos"
          value={String(data.activeEmployees)}
          icon={Users}
          tone="brand"
          hint="en el catálogo"
        />
        <StatCard
          label="Horas trabajadas esta semana"
          value={`${data.weeklyHours.toFixed(1)} h`}
          icon={Clock3}
          tone="emerald"
          hint="regulares + extra"
        />
        <StatCard
          label="Nómina de la semana"
          value={formatCurrency(data.weeklyPayroll)}
          icon={Wallet}
          tone="blue"
          hint="neto calculado"
        />
        <StatCard
          label="Empleados con retardos"
          value={String(data.employeesWithTardiness.length)}
          icon={AlertTriangle}
          tone="red"
          hint="entradas después de 09:00"
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-bold text-slate-900">Horas trabajadas por día</h2>
          <p className="mt-1 text-xs text-slate-500">Últimos 7 días · todas las horas sumadas</p>
          {data.hoursByDay.every((day) => day.hours === 0) ? (
            <EmptyState
              icon={Clock3}
              title="Sin horas registradas en los últimos 7 días"
              description="Las horas aparecerán aquí cuando se capturen jornadas."
            />
          ) : (
            <div className="mt-5 h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.hoursByDay} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => formatDate(String(value))}
                    tick={{ fontSize: 11, fill: chartColors.text }}
                  />
                  <YAxis tick={{ fontSize: 11, fill: chartColors.text }} />
                  <Tooltip
                    labelFormatter={(value) => formatDate(String(value))}
                    formatter={(value) => [`${Number(value).toFixed(1)} h`, 'Horas']}
                    contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0' }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="hours"
                    name="Horas"
                    stroke={chartColors.line}
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-bold text-slate-900">Nómina por departamento</h2>
          <p className="mt-1 text-xs text-slate-500">Semana actual · neto en MXN</p>
          {data.payrollByDepartment.every((row) => row.total === 0) ? (
            <EmptyState
              icon={Wallet}
              title="Sin nómina para esta semana"
              description="El gráfico se llenará al registrar jornadas."
            />
          ) : (
            <div className="mt-5 h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.payrollByDepartment} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                  <XAxis dataKey="department" tick={{ fontSize: 11, fill: chartColors.text }} />
                  <YAxis tick={{ fontSize: 11, fill: chartColors.text }} />
                  <Tooltip
                    formatter={(value) => [formatCurrency(Number(value)), 'Neto']}
                    contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0' }}
                  />
                  <Legend />
                  <Bar dataKey="total" name="Neto" fill={chartColors.bar} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
            <ClipboardList size={18} className="text-brand-600" />
            <h2 className="font-bold text-slate-900">Últimos registros</h2>
          </div>
          {data.recentRecords.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="Aún no hay registros esta semana"
              description="Los últimos registros aparecerán cuando se capturen jornadas."
            />
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-3">Empleado</th>
                  <th className="px-5 py-3">Fecha</th>
                  <th className="px-5 py-3">Horas</th>
                  <th className="px-5 py-3">Retardo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.recentRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium text-slate-800">{record.employee}</td>
                    <td className="px-5 py-3 text-slate-600">{formatDate(record.date)}</td>
                    <td className="px-5 py-3">
                      <span className="text-slate-700">{record.hours.toFixed(1)} h</span>{' '}
                      <OvertimeBadge hours={record.overtimeHours} />
                    </td>
                    <td className="px-5 py-3">
                      <TardinessBadge tardy={record.hasTardiness} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-500" />
            <h2 className="font-bold text-slate-900">Alertas</h2>
          </div>
          {data.employeesWithTardiness.length === 0 ? (
            <div className="mt-5 flex items-center gap-2 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-700">
              <CheckCircle2 size={18} /> Sin retardos esta semana.
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-slate-100">
              {data.employeesWithTardiness.map((item) => (
                <li key={item.employeeId} className="flex items-center justify-between py-3 text-sm">
                  <div>
                    <p className="font-medium text-slate-800">{item.employee}</p>
                    <p className="text-xs text-slate-500">{item.department}</p>
                  </div>
                  <Badge tone="red">{item.count} retardo{item.count === 1 ? '' : 's'}</Badge>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
