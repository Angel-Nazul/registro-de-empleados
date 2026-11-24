import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ChevronLeft, ChevronRight, Coins, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import { getWeekPayroll, updatePayroll, type PayrollUpdate } from '../api/payroll';
import Modal from '../components/Modal';
import { formatCurrency } from '../utils/formatters';
import { getMondayKey, shiftWeek, todayKey, weekRangeLabel } from '../utils/week';
import type { PayrollRow } from '../types';

type EditMode = 'descuentos' | 'tarifa' | null;

const inputClass =
  'w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100';

const Payroll = () => {
  const [weekStart, setWeekStart] = useState(() => getMondayKey(todayKey()));
  const [rows, setRows] = useState<PayrollRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<PayrollRow | null>(null);
  const [mode, setMode] = useState<EditMode>(null);
  const [values, setValues] = useState<PayrollUpdate>({
    tardinessDeduction: 0,
    complianceDeduction: 0,
    otherDeductions: 0,
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getWeekPayroll(weekStart);
      setRows(data.payrolls);
    } catch {
      toast.error('No se pudo cargar la nómina de la semana');
    } finally {
      setLoading(false);
    }
  }, [weekStart]);

  useEffect(() => {
    void load();
  }, [load]);

  const openEditor = (row: PayrollRow, nextMode: Exclude<EditMode, null>) => {
    setEditing(row);
    setMode(nextMode);
    setValues({
      tardinessDeduction: row.tardinessDeduction,
      complianceDeduction: row.complianceDeduction,
      otherDeductions: row.otherDeductions,
      hourlyRateOverride: row.hourlyRate,
    });
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editing) return;

    setSaving(true);
    try {
      const payload: PayrollUpdate =
        mode === 'tarifa'
          ? {
              tardinessDeduction: editing.tardinessDeduction,
              complianceDeduction: editing.complianceDeduction,
              otherDeductions: editing.otherDeductions,
              hourlyRateOverride: values.hourlyRateOverride ?? editing.hourlyRate,
            }
          : {
              tardinessDeduction: values.tardinessDeduction,
              complianceDeduction: values.complianceDeduction,
              otherDeductions: values.otherDeductions,
            };

      const updated = await updatePayroll(editing.id, payload);
      setRows((current) => current.map((row) => (row.id === updated.id ? updated : row)));
      toast.success('Nómina recalculada');
      setMode(null);
      setEditing(null);
    } catch (error) {
      toast.error(
        error instanceof Error && 'response' in error
          ? ((error as { response?: { data?: { message?: string } } }).response?.data?.message ??
              'No se pudo guardar')
          : 'No se pudo guardar',
      );
    } finally {
      setSaving(false);
    }
  };

  const totals = rows.reduce(
    (acc, row) => ({
      base: acc.base + row.baseSalary,
      overtime: acc.overtime + row.overtimePay,
      deductions:
        acc.deductions +
        row.tardinessDeduction +
        row.complianceDeduction +
        row.otherDeductions,
      net: acc.net + row.netSalary,
    }),
    { base: 0, overtime: 0, deductions: 0, net: 0 },
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Nómina semanal</h1>
          <p className="mt-1 text-sm text-slate-500">Semana laboral de lunes a domingo · MXN</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1.5">
          <button
            type="button"
            aria-label="Semana anterior"
            onClick={() => setWeekStart((current) => shiftWeek(current, -1))}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={() => setWeekStart(getMondayKey(todayKey()))}
            className="px-3 text-sm font-semibold text-slate-800 hover:text-brand-700"
          >
            {weekRangeLabel(weekStart)}
          </button>
          <button
            type="button"
            aria-label="Semana siguiente"
            onClick={() => setWeekStart((current) => shiftWeek(current, 1))}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[1300px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Empleado</th>
              <th className="px-4 py-3">Horas reg.</th>
              <th className="px-4 py-3">Horas extra</th>
              <th className="px-4 py-3">Tarifa</th>
              <th className="px-4 py-3">Salario base</th>
              <th className="px-4 py-3">Pago extra</th>
              <th className="px-4 py-3">Retardos $</th>
              <th className="px-4 py-3">Incumplimiento $</th>
              <th className="px-4 py-3">Otros $</th>
              <th className="px-4 py-3">Neto</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={11} className="px-4 py-10 text-center text-slate-500">
                  Calculando nómina...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-4 py-10 text-center text-slate-500">
                  No hay empleados activos para esta semana.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-800">{row.employeeName}</p>
                    <p className="text-xs text-slate-400">
                      {row.position} · {row.daysWorked} días
                    </p>
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
                  <td className="px-4 py-3 text-red-600">{formatCurrency(row.otherDeductions)}</td>
                  <td className="px-4 py-3 font-bold text-slate-900">
                    {formatCurrency(row.netSalary)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        title="Editar descuentos"
                        onClick={() => openEditor(row, 'descuentos')}
                        className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:border-brand-600 hover:text-brand-700"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        title="Editar tarifa"
                        onClick={() => openEditor(row, 'tarifa')}
                        className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:border-brand-600 hover:text-brand-700"
                      >
                        <Coins size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {!loading && rows.length > 0 && (
            <tfoot className="border-t-2 border-slate-200 bg-brand-50 font-semibold text-slate-900">
              <tr>
                <td className="px-4 py-4">Total de la nómina</td>
                <td className="px-4 py-4" colSpan={3} />
                <td className="px-4 py-4">{formatCurrency(totals.base)}</td>
                <td className="px-4 py-4">{formatCurrency(totals.overtime)}</td>
                <td className="px-4 py-4" colSpan={3}>
                  Descuentos: {formatCurrency(totals.deductions)}
                </td>
                <td className="px-4 py-4 text-brand-700">{formatCurrency(totals.net)}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {editing && mode && (
        <Modal
          title={mode === 'tarifa' ? 'Editar tarifa' : 'Editar descuentos'}
          subtitle={`${editing.employeeName} · ${weekRangeLabel(weekStart)}`}
          size="md"
          onClose={() => {
            setMode(null);
            setEditing(null);
          }}
          footer={
            <>
              <button
                type="button"
                onClick={() => {
                  setMode(null);
                  setEditing(null);
                }}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="payroll-edit-form"
                disabled={saving}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {saving ? 'Guardando...' : 'Guardar y recalcular'}
              </button>
            </>
          }
        >
          <form id="payroll-edit-form" onSubmit={handleSave} className="space-y-4">
            {mode === 'tarifa' ? (
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">
                  Tarifa por hora (MXN)
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={inputClass}
                  value={values.hourlyRateOverride ?? editing.hourlyRate}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      hourlyRateOverride: Number(event.target.value),
                    }))
                  }
                />
                <span className="mt-1 block text-xs text-slate-400">
                  El cambio aplica a este empleado y recalcula la semana.
                </span>
              </label>
            ) : (
              [
                ['tardinessDeduction', 'Retardos ($)'],
                ['complianceDeduction', 'Incumplimiento ($)'],
                ['otherDeductions', 'Otros descuentos ($)'],
              ].map(([field, label]) => (
                <label key={field} className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className={inputClass}
                    value={values[field as keyof PayrollUpdate] as number}
                    onChange={(event) =>
                      setValues((current) => ({
                        ...current,
                        [field]: Number(event.target.value),
                      }))
                    }
                  />
                </label>
              ))
            )}
            <div className="rounded-lg bg-slate-50 p-3 text-sm">
              <span className="text-slate-500">Neto actual: </span>
              <span className="font-bold text-slate-900">{formatCurrency(editing.netSalary)}</span>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default Payroll;
