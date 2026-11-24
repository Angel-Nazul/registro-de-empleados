import { useState, type FormEvent } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from './Modal';
import { createTimeRecord, updateTimeRecord } from '../api/timeRecords';
import { useAuth } from '../context/AuthContext';
import { calculateLive } from '../utils/timeCalculations';
import type { Employee, TimeRecord, TimeRecordFormValues } from '../types';

interface TimeRecordFormProps {
  dateDefault: string;
  employees?: Employee[];
  record?: TimeRecord | null;
  onClose: () => void;
  onSaved: (record: TimeRecord) => void;
}

const inputClass =
  'w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100';

const mexicoTime = (iso: string | null): string => {
  if (!iso) return '';
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Mexico_City',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(iso));
  const value = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? '';
  return `${value('hour')}:${value('minute')}`;
};

const TimeRecordForm = ({
  dateDefault,
  employees = [],
  record,
  onClose,
  onSaved,
}: TimeRecordFormProps) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [form, setForm] = useState<TimeRecordFormValues>({
    employeeId: record?.employeeId ?? employees[0]?.id,
    date: record?.date?.slice(0, 10) ?? dateDefault,
    checkIn: mexicoTime(record?.checkIn ?? null),
    lunchOut: mexicoTime(record?.lunchOut ?? null),
    lunchIn: mexicoTime(record?.lunchIn ?? null),
    checkOut: mexicoTime(record?.checkOut ?? null),
    notes: record?.notes ?? '',
  });
  const [saving, setSaving] = useState(false);

  const live = calculateLive(form);
  const set = <K extends keyof TimeRecordFormValues>(key: K, value: TimeRecordFormValues[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isAdmin && !form.employeeId) {
      toast.error('Selecciona un empleado');
      return;
    }
    if (!form.date) {
      toast.error('Selecciona la fecha');
      return;
    }
    if (!live.hasValidOrder) {
      toast.error('Revisa el orden de las horas (entrada < comida < regreso < salida)');
      return;
    }

    setSaving(true);
    try {
      const response = record
        ? await updateTimeRecord(record.id, form)
        : await createTimeRecord(form);
      if (response.warning) {
        toast.error(response.warning, { duration: 5000 });
      } else {
        toast.success(record ? 'Registro actualizado' : 'Jornada registrada');
      }
      onSaved(response.timeRecord);
    } catch (error) {
      toast.error(
        error instanceof Error && 'response' in error
          ? ((error as { response?: { data?: { message?: string } } }).response?.data?.message ??
              'No se pudo guardar el registro')
          : 'No se pudo guardar el registro',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={record ? 'Editar jornada' : 'Registrar jornada'}
      subtitle="Jornada normal de 8 h · comida 1 h no pagada (12:00–15:00)"
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-white"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="time-record-form"
            disabled={saving}
            className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {saving ? 'Guardando...' : 'Guardar registro'}
          </button>
        </>
      }
    >
      <form id="time-record-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {isAdmin && (
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-sm font-medium text-slate-700">Empleado</span>
              <select
                className={inputClass}
                value={form.employeeId ?? ''}
                onChange={(event) => set('employeeId', Number(event.target.value))}
              >
                <option value="">Selecciona un empleado</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.fullName}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Fecha</span>
            <input
              type="date"
              className={inputClass}
              value={form.date}
              onChange={(event) => set('date', event.target.value)}
            />
          </label>

          <div className="hidden sm:block" />

          {(
            [
              ['checkIn', 'Hora de entrada'],
              ['lunchOut', 'Salida a comida'],
              ['lunchIn', 'Regreso de comida'],
              ['checkOut', 'Salida final'],
            ] as const
          ).map(([field, label]) => (
            <label key={field} className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
              <input
                type="time"
                className={inputClass}
                value={form[field]}
                onChange={(event) => set(field, event.target.value)}
              />
            </label>
          ))}
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-800">
            Horas trabajadas: {live.totalHours.toFixed(1)} h | Horas extra:{' '}
            {live.overtimeHours.toFixed(1)} h | Comida: 1h (
            <span className={live.lunchValid ? 'text-emerald-700' : 'text-amber-700'}>
              {live.lunchValid ? 'correcta' : '⚠ ajustar'}
            </span>
            )
          </p>
          {!live.hasValidOrder && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-red-600">
              <AlertTriangle size={14} /> El orden de las horas no es válido.
            </p>
          )}
          {live.hasValidOrder && !live.lunchValid && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-700">
              <AlertTriangle size={14} /> La comida debe durar 1 h y estar entre 12:00 y 15:00.
              Guardaremos una nota de alerta.
            </p>
          )}
          {live.hasValidOrder && live.lunchValid && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-emerald-700">
              <CheckCircle2 size={14} /> Jornada dentro de la política de comida.
            </p>
          )}
        </div>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Notas (opcionales)</span>
          <textarea
            className={`${inputClass} min-h-[80px]`}
            value={form.notes}
            onChange={(event) => set('notes', event.target.value)}
            placeholder="Ej. comida fuera del horario, permiso médico..."
          />
        </label>
      </form>
    </Modal>
  );
};

export default TimeRecordForm;
