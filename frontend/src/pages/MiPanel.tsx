import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarRange,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Pencil,
  PlayCircle,
  ReceiptText,
  UserRound,
  Wallet,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getEmployeeDashboard } from '../api/dashboard';
import { getMySummary } from '../api/me';
import { Badge, OvertimeBadge, StatusBadge, TardinessBadge } from '../components/Badge';
import EmptyState from '../components/EmptyState';
import { PageLoader, StatCardsSkeleton, TableSkeleton } from '../components/Skeleton';
import StatCard from '../components/StatCard';
import Tabs, { type TabItem } from '../components/Tabs';
import TimeRecordForm from '../components/TimeRecordForm';
import { useAuth } from '../context/AuthContext';
import { errorMessage } from '../utils/errors';
import { formatCurrency, formatDate, formatTime } from '../utils/formatters';
import {
  monthEndKey,
  monthStartKey,
  shiftMonth,
  todayKey,
  weekRangeLabel,
} from '../utils/week';
import type {
  ContractType,
  EmployeeDashboard,
  MySummary,
  SummaryRecord,
  TimeRecord,
} from '../types';

const tabs: TabItem[] = [
  { id: 'perfil', label: 'Mi perfil', icon: UserRound },
  { id: 'registros', label: 'Mis registros', icon: ClipboardList },
  { id: 'salario', label: 'Mi salario', icon: Wallet },
  { id: 'mensual', label: 'Resumen mensual', icon: CalendarRange },
];

const contractLabels: Record<ContractType, string> = {
  TIEMPO_COMPLETO: 'Tiempo completo',
  MEDIO_TIEMPO: 'Medio tiempo',
  TEMPORAL: 'Temporal',
};

const inputClass =
  'rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100';

/** Minutos desde medianoche en México para el saludo y la regla de edición de hoy. */
const mexicoMinutes = (): number => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Mexico_City',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const value = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  return value('hour') * 60 + value('minute');
};

const sumHours = (
  records: SummaryRecord[],
  field: 'regularHours' | 'overtimeHours',
): number => Number(records.reduce((sum, record) => sum + record[field], 0).toFixed(2));

const MiPanel = () => {
  const { user } = useAuth();
  const [month, setMonth] = useState(() => todayKey().slice(0, 7));
  const [dashboard, setDashboard] = useState<EmployeeDashboard | null>(null);
  const [summary, setSummary] = useState<MySummary | null>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [tab, setTab] = useState('perfil');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TimeRecord | null>(null);
  const [range, setRange] = useState(() => ({
    from: monthStartKey(todayKey().slice(0, 7)),
    to: monthEndKey(todayKey().slice(0, 7)),
  }));

  const loadDashboard = useCallback(async () => {
    try {
      setLoadingDashboard(true);
      setDashboard(await getEmployeeDashboard());
    } catch (error) {
      toast.error(errorMessage(error, 'No se pudo cargar tu resumen semanal'));
    } finally {
      setLoadingDashboard(false);
    }
  }, []);

  const loadSummary = useCallback(async () => {
    try {
      setLoadingSummary(true);
      setSummary(await getMySummary(month));
    } catch (error) {
      toast.error(errorMessage(error, 'No se pudo cargar tu información de RH'));
    } finally {
      setLoadingSummary(false);
    }
  }, [month]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    setRange({ from: monthStartKey(month), to: monthEndKey(month) });
    void loadSummary();
  }, [month, loadSummary]);

  const minutesNow = mexicoMinutes();
  const greeting =
    minutesNow < 12 * 60
      ? 'Buenos días'
      : minutesNow < 19 * 60
        ? 'Buenas tardes'
        : 'Buenas noches';
  const fullName = dashboard?.employee.fullName ?? summary?.profile.fullName ?? user?.email ?? '';
  const firstName = fullName.split(' ')[0];
  const today = dashboard?.todayStatus.date ?? todayKey();

  const filteredRecords = useMemo(
    () =>
      (summary?.records ?? []).filter(
        (record) => (!range.from || record.date >= range.from) && (!range.to || record.date <= range.to),
      ),
    [summary, range.from, range.to],
  );

  const rangeTotals = useMemo(
    () => ({
      days: new Set(filteredRecords.map((record) => record.date)).size,
      regular: sumHours(filteredRecords, 'regularHours'),
      overtime: sumHours(filteredRecords, 'overtimeHours'),
      tardiness: filteredRecords.filter((record) => record.hasTardiness).length,
    }),
    [filteredRecords],
  );

  const afterSave = () => {
    setFormOpen(false);
    setEditing(null);
    void loadDashboard();
    void loadSummary();
  };

  const profile = summary?.profile;

  return (
    <div>
      <div className="rounded-xl border border-brand-100 bg-gradient-to-r from-brand-50 to-white p-6">
        <p className="text-sm font-medium text-brand-700">{greeting}, {firstName}</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Mi Panel</h1>
        <p className="mt-1 text-sm text-slate-500">
          {formatDate(today)} · {dashboard?.employee.position ?? 'Empleado'} ·{' '}
          {dashboard?.employee.department ?? ''}
        </p>
      </div>

      {loadingDashboard && !dashboard ? (
        <div className="mt-6">
          <StatCardsSkeleton count={3} />
          <div className="mt-6"><PageLoader label="Preparando tu panel..." /></div>
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard
              label="Horas esta semana"
              value={`${(dashboard?.weeklyHours ?? 0).toFixed(1)} h`}
              icon={Clock3}
              tone="emerald"
              hint={weekRangeLabel(dashboard?.weekStart ?? todayKey())}
            />
            <StatCard
              label="Salario estimado"
              value={formatCurrency(dashboard?.weeklyEstimatedPay ?? 0)}
              icon={Wallet}
              tone="brand"
              hint="neto de la semana en curso"
            />
            <StatCard
              label="Estado de hoy"
              value={dashboard?.todayStatus.hasRecord ? 'Registrado' : 'Sin registrar'}
              icon={dashboard?.todayStatus.hasRecord ? CheckCircle2 : ClipboardList}
              tone={dashboard?.todayStatus.hasRecord ? 'emerald' : 'amber'}
              hint={formatDate(today)}
            />
          </div>

          <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <Clock3 size={19} className="text-brand-600" /> Registro rápido
              </h2>
              <Badge tone={dashboard?.todayStatus.hasRecord ? 'green' : 'yellow'}>
                {dashboard?.todayStatus.hasRecord ? 'Jornada capturada' : 'Pendiente'}
              </Badge>
            </div>

            {dashboard?.todayStatus.hasRecord && dashboard.todayStatus.timeRecord ? (
              <div className="mt-5">
                <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                  {[
                    ['Entrada', formatTime(dashboard.todayStatus.timeRecord.checkIn ?? '')],
                    ['Salida a comida', formatTime(dashboard.todayStatus.timeRecord.lunchOut ?? '')],
                    ['Regreso', formatTime(dashboard.todayStatus.timeRecord.lunchIn ?? '')],
                    ['Salida final', formatTime(dashboard.todayStatus.timeRecord.checkOut ?? '')],
                    [
                      'Horas regulares',
                      `${dashboard.todayStatus.timeRecord.regularHours.toFixed(1)} h`,
                    ],
                    ['Horas extra', `${dashboard.todayStatus.timeRecord.overtimeHours.toFixed(1)} h`],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-lg bg-slate-50 p-3">
                      <dt className="text-xs text-slate-500">{label}</dt>
                      <dd className="mt-0.5 font-semibold text-slate-800">{value}</dd>
                    </div>
                  ))}
                </dl>
                {dashboard.todayStatus.timeRecord.notes && (
                  <p className="mt-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                    {dashboard.todayStatus.timeRecord.notes}
                  </p>
                )}
                {dashboard.todayStatus.date === today && minutesNow < 23 * 60 + 59 && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(dashboard.todayStatus.timeRecord);
                      setFormOpen(true);
                    }}
                    className="mt-5 flex items-center gap-2 rounded-lg border border-brand-200 px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50"
                  >
                    <Pencil size={15} /> Editar mi registro de hoy
                  </button>
                )}
              </div>
            ) : (
              <div className="mt-5 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-xl text-sm text-slate-500">
                  Aún no registras tu jornada de hoy. Captura tus horarios y el sistema calculará las
                  horas trabajadas y la comida.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(null);
                    setFormOpen(true);
                  }}
                  className="flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-700"
                >
                  <PlayCircle size={18} /> Registrar mi jornada de hoy
                </button>
              </div>
            )}
          </section>

          <section className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="font-bold text-slate-900">Últimos 5 registros</h2>
            </div>
            {(dashboard?.lastRecords.length ?? 0) === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="Aún no tienes registros esta semana"
                description="Cuando registres tu jornada aparecerá aquí."
              />
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Fecha</th>
                    <th className="px-5 py-3">Horas reg.</th>
                    <th className="px-5 py-3">Extra</th>
                    <th className="px-5 py-3">Retardo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dashboard?.lastRecords.map((record) => (
                    <tr key={record.id}>
                      <td className="px-5 py-3 font-medium text-slate-800">
                        {formatDate(record.date)}
                      </td>
                      <td className="px-5 py-3">{record.regularHours.toFixed(1)} h</td>
                      <td className="px-5 py-3"><OvertimeBadge hours={record.overtimeHours} /></td>
                      <td className="px-5 py-3"><TardinessBadge tardy={record.hasTardiness} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}

      <section className="mt-8">
        <div className="mb-4 flex items-center gap-2">
          <BriefcaseBusiness size={19} className="text-brand-600" />
          <h2 className="text-lg font-bold text-slate-900">Mi información de Recursos Humanos</h2>
        </div>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <Tabs tabs={tabs} active={tab} onChange={setTab} />

          <div className="p-5 sm:p-6">
            {loadingSummary && !summary ? (
              tab === 'perfil' ? (
                <StatCardsSkeleton count={3} />
              ) : (
                <TableSkeleton columns={5} />
              )
            ) : !summary ? (
              <EmptyState
                icon={AlertIcon}
                title="No fue posible cargar tu información"
                description="Intenta recargar la página en unos segundos."
              />
            ) : tab === 'perfil' ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {[
                  ['Nombre completo', profile?.fullName ?? '—'],
                  ['Correo electrónico', profile?.email ?? '—'],
                  ['Teléfono', profile?.phone ?? '—'],
                  ['Puesto', profile?.position ?? '—'],
                  ['Departamento', profile?.department ?? '—'],
                  ['Fecha de contratación', formatDate(profile?.hireDate ?? '')],
                  ['Tarifa por hora', formatCurrency(profile?.hourlyRate ?? 0)],
                  [
                    'Tipo de contrato',
                    contractLabels[(profile?.contractType ?? 'TIEMPO_COMPLETO') as ContractType],
                  ],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                    <p className="text-xs text-slate-500">{label}</p>
                    <p className="mt-1 font-semibold text-slate-800">{value}</p>
                  </div>
                ))}
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">Estado</p>
                  <div className="mt-1"><StatusBadge status={profile?.status ?? 'INACTIVO'} /></div>
                </div>
              </div>
            ) : tab === 'registros' ? (
              <div>
                <div className="flex flex-wrap items-end gap-3">
                  <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                    Desde
                    <input
                      type="date"
                      aria-label="Desde"
                      className={inputClass}
                      value={range.from}
                      onChange={(event) => setRange((current) => ({ ...current, from: event.target.value }))}
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                    Hasta
                    <input
                      type="date"
                      aria-label="Hasta"
                      className={inputClass}
                      value={range.to}
                      onChange={(event) => setRange((current) => ({ ...current, to: event.target.value }))}
                    />
                  </label>
                  <div className="flex gap-2 text-xs">
                    <Badge tone="slate">{rangeTotals.days} días</Badge>
                    <Badge tone="green">{rangeTotals.regular.toFixed(1)} h reg.</Badge>
                    <Badge tone="yellow">+{rangeTotals.overtime.toFixed(1)} h extra</Badge>
                    <Badge tone="red">{rangeTotals.tardiness} retardos</Badge>
                  </div>
                </div>

                <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
                  {filteredRecords.length === 0 ? (
                    <EmptyState
                      icon={ClipboardList}
                      title="Aún no tienes registros en este periodo"
                      description="Selecciona otro rango de fechas para consultar tus jornadas."
                    />
                  ) : (
                    <table className="w-full min-w-[900px] text-left text-sm">
                      <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                        <tr>
                          <th className="px-4 py-3">Fecha</th>
                          <th className="px-4 py-3">Entrada</th>
                          <th className="px-4 py-3">Comida</th>
                          <th className="px-4 py-3">Regreso</th>
                          <th className="px-4 py-3">Salida</th>
                          <th className="px-4 py-3">Horas</th>
                          <th className="px-4 py-3">Retardo</th>
                          <th className="px-4 py-3">Notas</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredRecords.map((record) => (
                          <tr key={record.id}>
                            <td className="px-4 py-3 font-medium text-slate-800">
                              {formatDate(record.date)}
                            </td>
                            <td className="px-4 py-3">{formatTime(record.checkIn ?? '')}</td>
                            <td className="px-4 py-3">{formatTime(record.lunchOut ?? '')}</td>
                            <td className="px-4 py-3">{formatTime(record.lunchIn ?? '')}</td>
                            <td className="px-4 py-3">{formatTime(record.checkOut ?? '')}</td>
                            <td className="px-4 py-3">
                              {record.regularHours.toFixed(1)} h
                              <OvertimeBadge hours={record.overtimeHours} />
                            </td>
                            <td className="px-4 py-3"><TardinessBadge tardy={record.hasTardiness} /></td>
                            <td className="max-w-[200px] truncate px-4 py-3 text-xs text-slate-500" title={record.notes ?? ''}>
                              {record.notes ?? '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            ) : tab === 'salario' ? (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                {summary.payrolls.length === 0 ? (
                  <EmptyState icon={Wallet} title="Aún no hay historial de salario" />
                ) : (
                  <table className="w-full min-w-[1100px] text-left text-sm">
                    <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Semana</th>
                        <th className="px-4 py-3">Horas reg.</th>
                        <th className="px-4 py-3">Extra</th>
                        <th className="px-4 py-3">Tarifa</th>
                        <th className="px-4 py-3">Base</th>
                        <th className="px-4 py-3">Pago extra</th>
                        <th className="px-4 py-3">Retardos</th>
                        <th className="px-4 py-3">Incumpl.</th>
                        <th className="px-4 py-3">Otros</th>
                        <th className="px-4 py-3">Neto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {summary.payrolls.map((row) => (
                        <tr key={row.id}>
                          <td className="px-4 py-3 font-medium text-slate-800">
                            {weekRangeLabel(row.weekStart)}
                          </td>
                          <td className="px-4 py-3">{row.regularHours.toFixed(1)} h</td>
                          <td className="px-4 py-3 text-amber-700">{row.overtimeHours.toFixed(1)} h</td>
                          <td className="px-4 py-3">{formatCurrency(row.hourlyRate)}/h</td>
                          <td className="px-4 py-3">{formatCurrency(row.baseSalary)}</td>
                          <td className="px-4 py-3">{formatCurrency(row.overtimePay)}</td>
                          <td className="px-4 py-3 text-red-600">
                            {formatCurrency(row.tardinessDeduction)}
                          </td>
                          <td className="px-4 py-3 text-red-600">
                            {formatCurrency(row.complianceDeduction)}
                          </td>
                          <td className="px-4 py-3 text-red-600">
                            {formatCurrency(row.otherDeductions)}
                          </td>
                          <td className="px-4 py-3 font-bold text-brand-700">
                            {formatCurrency(row.netSalary)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ) : (
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
                    Mes
                    <input
                      type="month"
                      aria-label="Mes del resumen"
                      className={inputClass}
                      value={month}
                      onChange={(event) => event.target.value && setMonth(event.target.value)}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setMonth((current) => shiftMonth(current, -1))}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                  >
                    Mes anterior
                  </button>
                  <button
                    type="button"
                    onClick={() => setMonth((current) => shiftMonth(current, 1))}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                  >
                    Mes siguiente
                  </button>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  <StatCard label="Horas trabajadas" value={`${summary.monthly.totalHours.toFixed(1)} h`} icon={Clock3} tone="emerald" hint={`${summary.recordTotals.daysWorked} días · ${summary.recordTotals.tardinessCount} retardos`} />
                  <StatCard label="Horas extra" value={`${summary.monthly.overtimeHours.toFixed(1)} h`} icon={ReceiptText} tone="amber" hint="pagadas al 1.5x" />
                  <StatCard label="Salario bruto" value={formatCurrency(summary.monthly.grossSalary)} icon={Wallet} tone="blue" hint="base + horas extra" />
                  <StatCard label="Descuentos" value={formatCurrency(summary.monthly.deductions)} icon={ClipboardList} tone="red" hint="aplicados por RRHH" />
                  <StatCard label="Salario neto del mes" value={formatCurrency(summary.monthly.netSalary)} icon={Wallet} tone="brand" hint={`${summary.monthly.weeks} semanas consideradas`} />
                </div>

                <div className="mt-5 flex items-center gap-2 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
                  <ArrowRight size={16} className="text-brand-600" />
                  Los descuentos se toman de las semanas que se cruzan con el mes seleccionado.
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {formOpen && (
        <TimeRecordForm
          key={editing?.id ?? 'new'}
          record={editing}
          dateDefault={today}
          onClose={() => {
            setFormOpen(false);
            setEditing(null);
          }}
          onSaved={afterSave}
        />
      )}
    </div>
  );
};

// Icono local para el estado de error del panel RH.
const AlertIcon = ClipboardList;

export default MiPanel;
