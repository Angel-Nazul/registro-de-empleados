import { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  deleteTimeRecord,
  getTimeRecords,
} from '../api/timeRecords';
import { getEmployees } from '../api/employees';
import ConfirmDialog from '../components/ConfirmDialog';
import TimeRecordForm from '../components/TimeRecordForm';
import { useAuth } from '../context/AuthContext';
import { formatDate, formatTime } from '../utils/formatters';
import { todayKey } from '../utils/week';
import type { Employee, TimeRecord } from '../types';

const TimeRecords = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [records, setRecords] = useState<TimeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TimeRecord | null>(null);
  const [toDelete, setToDelete] = useState<TimeRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    getEmployees({ status: 'ACTIVO' })
      .then((data) => {
        setEmployees(data);
        if (data.length) setSelectedEmployee(String(data[0].id));
      })
      .catch(() => toast.error('No se pudieron cargar los empleados'));
  }, [isAdmin]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getTimeRecords({
        employeeId: isAdmin ? (selectedEmployee ? Number(selectedEmployee) : undefined) : undefined,
        from: from || undefined,
        to: to || undefined,
      });
      setRecords(data);
    } catch {
      toast.error('No se pudieron cargar los registros');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, selectedEmployee, from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteTimeRecord(toDelete.id);
      toast.success('Registro eliminado');
      setToDelete(null);
      await load();
    } catch {
      toast.error('No se pudo eliminar el registro');
    } finally {
      setDeleting(false);
    }
  };

  const title = isAdmin ? 'Horarios' : 'Mis Registros';

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {isAdmin
              ? 'Registros de jornada y cálculo automático de horas'
              : 'Consulta y registra tus jornadas diarias'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
          className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          <Plus size={17} /> {isAdmin ? 'Nuevo registro' : 'Registrar mi jornada'}
        </button>
      </div>

      <div className="mt-6 flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-white p-4">
        {isAdmin && (
          <select
            className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-brand-600"
            value={selectedEmployee}
            onChange={(event) => setSelectedEmployee(event.target.value)}
          >
            <option value="">Selecciona un empleado</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.fullName}
              </option>
            ))}
          </select>
        )}
        <label className="flex items-center gap-2 text-sm text-slate-600">
          Desde
          <input
            type="date"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-600"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          Hasta
          <input
            type="date"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-600"
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
        </label>
      </div>

      <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[1000px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Fecha</th>
              {isAdmin && <th className="px-4 py-3">Empleado</th>}
              <th className="px-4 py-3">Entrada</th>
              <th className="px-4 py-3">Salida comida</th>
              <th className="px-4 py-3">Regreso</th>
              <th className="px-4 py-3">Salida final</th>
              <th className="px-4 py-3">Horas reg.</th>
              <th className="px-4 py-3">Extra</th>
              <th className="px-4 py-3">Notas</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={isAdmin ? 10 : 9} className="px-4 py-10 text-center text-slate-500">
                  Cargando...
                </td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 10 : 9} className="px-4 py-10 text-center text-slate-500">
                  No hay registros en el rango seleccionado.
                </td>
              </tr>
            ) : (
              records.map((record) => (
                <tr key={record.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {formatDate(record.date)}
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-slate-600">
                      {record.employee?.fullName ?? `#${record.employeeId}`}
                    </td>
                  )}
                  <td className="px-4 py-3 text-slate-600">{formatTime(record.checkIn ?? '')}</td>
                  <td className="px-4 py-3 text-slate-600">{formatTime(record.lunchOut ?? '')}</td>
                  <td className="px-4 py-3 text-slate-600">{formatTime(record.lunchIn ?? '')}</td>
                  <td className="px-4 py-3 text-slate-600">{formatTime(record.checkOut ?? '')}</td>
                  <td className="px-4 py-3 text-slate-700">{record.regularHours.toFixed(1)} h</td>
                  <td className="px-4 py-3 text-amber-700">{record.overtimeHours.toFixed(1)} h</td>
                  <td className="max-w-[220px] px-4 py-3 text-xs text-slate-500">
                    {record.notes ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    {isAdmin && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          title="Editar"
                          onClick={() => {
                            setEditing(record);
                            setFormOpen(true);
                          }}
                          className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:border-brand-600 hover:text-brand-700"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          title="Eliminar"
                          onClick={() => setToDelete(record)}
                          className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:border-red-300 hover:text-red-600"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {formOpen && (
        <TimeRecordForm
          key={editing?.id ?? 'new'}
          employees={employees}
          record={editing}
          dateDefault={todayKey()}
          onClose={() => setFormOpen(false)}
          onSaved={() => {
            setFormOpen(false);
            void load();
          }}
        />
      )}

      {toDelete && (
        <ConfirmDialog
          title="Eliminar registro"
          message={`¿Eliminar la jornada del ${formatDate(toDelete.date)}? Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar"
          loading={deleting}
          onCancel={() => setToDelete(null)}
          onConfirm={() => void confirmDelete()}
        />
      )}
    </div>
  );
};

export default TimeRecords;
