import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Info, LockKeyhole } from 'lucide-react';
import toast from 'react-hot-toast';
import { getPayrollHistory, getWeekPayroll } from '../api/payroll';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import { getMondayKey, shiftWeek, todayKey, weekRangeLabel } from '../utils/week';
import type { PayrollRow } from '../types';

const MySalary = () => {
  const { user } = useAuth();
  const [weekStart, setWeekStart] = useState(() => getMondayKey(todayKey()));
  const [row, setRow] = useState<PayrollRow | null>(null);
  const [history, setHistory] = useState<PayrollRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.employeeId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await getWeekPayroll(weekStart);
      setRow(data.payrolls.find((item) => item.employeeId === user.employeeId) ?? null);
    } catch {
      toast.error('No se pudo cargar tu salario semanal');
    } finally {
      setLoading(false);
    }
  }, [weekStart, user?.employeeId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!user?.employeeId) return;
    getPayrollHistory(user.employeeId, 8)
      .then(setHistory)
      .catch(() => undefined);
  }, [user?.employeeId]);

  const totalDeductions = row
    ? row.tardinessDeduction + row.complianceDeduction + row.otherDeductions
    : 0;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mi Salario</h1>
          <p className="mt-1 text-sm text-slate-500">Consulta semanal · solo lectura</p>
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

      <div className="mt-6 flex items-start gap-2 rounded-xl border border-brand-100 bg-brand-50 p-4 text-sm text-brand-800">
        <Info size={17} className="mt-0.5 shrink-0" />
        <p>Los descuentos son aplicados por el área de Recursos Humanos.</p>
      </div>

      {loading ? (
        <p className="mt-8 text-center text-slate-500">Calculando tu salario...</p>
      ) : !row ? (
        <p className="mt-8 rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-500">
          No hay datos de salario para esta semana.
        </p>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Salario base', value: row.baseSalary, tone: 'text-slate-900' },
              { label: 'Horas extra', value: row.overtimePay, tone: 'text-amber-700' },
              { label: 'Descuentos', value: -totalDeductions, tone: 'text-red-600' },
              { label: 'Neto a pagar', value: row.netSalary, tone: 'text-brand-700' },
            ].map((card) => (
              <div key={card.label} className="rounded-xl border border-slate-200 bg-white p-5">
                <p className="text-sm text-slate-500">{card.label}</p>
                <p className={`mt-2 text-xl font-bold ${card.tone}`}>
                  {formatCurrency(card.value)}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">Desglose de la semana</h2>
              <LockKeyhole size={15} className="text-slate-400" />
            </div>
            <dl className="mt-5 divide-y divide-slate-100 text-sm">
              {[
                ['Horas regulares', `${row.regularHours.toFixed(1)} h`],
                ['Horas extra', `${row.overtimeHours.toFixed(1)} h`],
                ['Tarifa por hora', formatCurrency(row.hourlyRate)],
                ['Salario base', formatCurrency(row.baseSalary)],
                ['Pago de horas extra (1.5x)', formatCurrency(row.overtimePay)],
                ['Retardos', formatCurrency(row.tardinessDeduction)],
                ['Incumplimiento', formatCurrency(row.complianceDeduction)],
                ['Otros descuentos', formatCurrency(row.otherDeductions)],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between py-3">
                  <dt className="text-slate-500">{label}</dt>
                  <dd className="font-medium text-slate-800">{value}</dd>
                </div>
              ))}
              <div className="flex justify-between py-4">
                <dt className="font-bold text-slate-900">Neto</dt>
                <dd className="text-lg font-bold text-brand-700">{formatCurrency(row.netSalary)}</dd>
              </div>
            </dl>
          </div>
        </>
      )}

      {history.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Semana</th>
                <th className="px-4 py-3">Horas reg.</th>
                <th className="px-4 py-3">Extra</th>
                <th className="px-4 py-3">Neto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3">{formatDate(item.weekStart)}</td>
                  <td className="px-4 py-3">{item.regularHours.toFixed(1)} h</td>
                  <td className="px-4 py-3">{item.overtimeHours.toFixed(1)} h</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">
                    {formatCurrency(item.netSalary)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MySalary;
