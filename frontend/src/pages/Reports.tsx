import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  Clock3,
  Download,
  FileSpreadsheet,
  FileText,
  TimerReset,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getEmployees } from '../api/employees';
import { exportCsv, exportExcel, getAttendance } from '../api/reports';
import { Badge, TardinessBadge } from '../components/Badge';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';
import { Skeleton, StatCardsSkeleton, TableSkeleton } from '../components/Skeleton';
import StatCard from '../components/StatCard';
import { errorMessage } from '../utils/errors';
import { formatCurrency, formatDate } from '../utils/formatters';
import { addDays, getMondayKey, todayKey } from '../utils/week';
import type { Employee, ReportFilters, ReportsResponse } from '../types';

const PAGE_SIZE = 20;
const thisWeek = (): ReportFilters => {
  const monday = getMondayKey(todayKey());
  return { from: monday, to: addDays(monday, 6) };
};

const inputClass =
  'rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100';

const Reports = () => {
  const [filters, setFilters] = useState<ReportFilters>(thisWeek);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [data, setData] = useState<ReportsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<'excel' | 'csv' | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    getEmployees()
      .then(setEmployees)
      .catch(() => toast.error('No se pudo cargar el catálogo de empleados'));
  }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setData(await getAttendance(filters));
    } catch (error) {
      toast.error(errorMessage(error, 'No se pudo cargar el reporte de asistencia'));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [filters.from, filters.to, filters.employeeId, filters.department]);

  const departments = useMemo(
    () => Array.from(new Set(employees.map((employee) => employee.department))).sort(),
    [employees],
  );

  const totals = useMemo(() => {
    const summary = data?.summary ?? [];
    return {
      employees: summary.length,
      hours: summary.reduce((sum, row) => sum + row.totalHours, 0),
      overtime: summary.reduce((sum, row) => sum + row.overtimeHours, 0),
      tardiness: summary.reduce((sum, row) => sum + row.tardinessCount, 0),
    };
  }, [data]);

  const rows = data?.rows ?? [];
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleExport = async (kind: 'excel' | 'csv') => {
    try {
      setExporting(kind);
      const fileName = kind === 'excel' ? await exportExcel(filters) : await exportCsv(filters);
      toast.success(`Archivo ${fileName} descargado`);
    } catch (error) {
      toast.error(errorMessage(error, 'No se pudo exportar el reporte'));
    } finally {
      setExporting(null);
    }
  };

  const setFilter = <K extends keyof ReportFilters>(key: K, value: ReportFilters[K]) =>
    setFilters((current) => ({ ...current, [key]: value }));

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reportes de asistencia</h1>
          <p className="mt-1 text-sm text-slate-500">
            Consolidado de jornadas · montos en MXN
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void handleExport('excel')}
            disabled={exporting !== null}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            <FileSpreadsheet size={17} />
            {exporting === 'excel' ? 'Generando...' : 'Exportar Excel'}
          </button>
          <button
            type="button"
            onClick={() => void handleExport('csv')}
            disabled={exporting !== null}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            <Download size={17} />
            {exporting === 'csv' ? 'Generando...' : 'Exportar CSV'}
          </button>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Desde
          <input
            type="date"
            aria-label="Fecha inicial"
            className={inputClass}
            value={filters.from}
            onChange={(event) => setFilter('from', event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Hasta
          <input
            type="date"
            aria-label="Fecha final"
            className={inputClass}
            value={filters.to}
            onChange={(event) => setFilter('to', event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Empleado
          <select
            aria-label="Empleado"
            className={inputClass}
            value={filters.employeeId ?? ''}
            onChange={(event) =>
              setFilter('employeeId', event.target.value ? Number(event.target.value) : undefined)
            }
          >
            <option value="">Todos los empleados</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.fullName}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Departamento
          <select
            aria-label="Departamento"
            className={inputClass}
            value={filters.department ?? ''}
            onChange={(event) => setFilter('department', event.target.value || undefined)}
          >
            <option value="">Todos los departamentos</option>
            {departments.map((department) => (
              <option key={department} value={department}>
                {department}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => setFilters(thisWeek())}
          className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          <CalendarDays size={16} /> Esta semana
        </button>
      </div>

      <div className="mt-6">
        {loading && !data ? (
          <StatCardsSkeleton />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total empleados"
              value={String(totals.employees)}
              icon={Users}
              tone="brand"
              hint="con registros en el rango"
            />
            <StatCard
              label="Total horas"
              value={`${totals.hours.toFixed(1)} h`}
              icon={Clock3}
              tone="emerald"
              hint="regulares + extra"
            />
            <StatCard
              label="Total horas extra"
              value={`${totals.overtime.toFixed(1)} h`}
              icon={TimerReset}
              tone="amber"
              hint="pagadas al 1.5x"
            />
            <StatCard
              label="Total retardos"
              value={String(totals.tardiness)}
              icon={FileText}
              tone="red"
              hint="entradas después de las 09:00"
            />
          </div>
        )}
      </div>

      <div className="mt-6">
        {loading && !data ? (
          <TableSkeleton columns={8} />
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white">
            <EmptyState
              icon={CalendarDays}
              title="Aún no hay registros en este rango"
              description="Ajusta las fechas o selecciona otro empleado para ver la asistencia."
            />
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1200px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Empleado</th>
                    <th className="px-4 py-3">Departamento</th>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Entrada</th>
                    <th className="px-4 py-3">Salida comida</th>
                    <th className="px-4 py-3">Regreso</th>
                    <th className="px-4 py-3">Salida final</th>
                    <th className="px-4 py-3">Horas reg.</th>
                    <th className="px-4 py-3">Extra</th>
                    <th className="px-4 py-3">Retardo</th>
                    <th className="px-4 py-3">Comida</th>
                    <th className="px-4 py-3">Notas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pageRows.map((row) => (
                    <tr key={`${row.employeeId}-${row.date}`} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-800">{row.employee}</td>
                      <td className="px-4 py-3 text-slate-600">{row.department}</td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(row.date)}</td>
                      <td className="px-4 py-3 text-slate-600">{row.checkIn ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{row.lunchOut ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{row.lunchIn ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{row.checkOut ?? '—'}</td>
                      <td className="px-4 py-3">{row.regularHours.toFixed(1)} h</td>
                      <td className="px-4 py-3 text-amber-700">{row.overtimeHours.toFixed(1)} h</td>
                      <td className="px-4 py-3">
                        <TardinessBadge tardy={row.hasTardiness} />
                      </td>
                      <td className="px-4 py-3">
                        {row.hasLunchIssue ? <Badge tone="yellow">⚠ revisar</Badge> : '—'}
                      </td>
                      <td className="max-w-[180px] truncate px-4 py-3 text-xs text-slate-500" title={row.notes ?? ''}>
                        {row.notes ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pageSize={PAGE_SIZE} total={rows.length} onPage={setPage} />
          </div>
        )}
      </div>

      {data && data.summary.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Resumen por empleado</th>
                <th className="px-4 py-3">Días</th>
                <th className="px-4 py-3">Horas reg.</th>
                <th className="px-4 py-3">Horas extra</th>
                <th className="px-4 py-3">Retardos</th>
                <th className="px-4 py-3">Descuentos</th>
                <th className="px-4 py-3">Neto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.summary.map((row) => (
                <tr key={row.employeeId}>
                  <td className="px-4 py-3 font-medium text-slate-800">{row.employee}</td>
                  <td className="px-4 py-3">{row.daysWorked}</td>
                  <td className="px-4 py-3">{row.regularHours.toFixed(1)} h</td>
                  <td className="px-4 py-3 text-amber-700">{row.overtimeHours.toFixed(1)} h</td>
                  <td className="px-4 py-3 text-red-600">{row.tardinessCount}</td>
                  <td className="px-4 py-3 text-red-600">
                    {formatCurrency(row.tardinessDeduction + row.otherDeductions)}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {formatCurrency(row.netSalary)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {loading && data && (
        <div className="mt-4 flex justify-center">
          <Skeleton className="h-5 w-40" />
        </div>
      )}
    </div>
  );
};

export default Reports;
