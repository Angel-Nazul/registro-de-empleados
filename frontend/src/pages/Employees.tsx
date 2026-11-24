import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Search, UserX } from 'lucide-react';
import toast from 'react-hot-toast';
import { deactivateEmployee, getEmployees } from '../api/employees';
import ConfirmDialog from '../components/ConfirmDialog';
import EmployeeModal from '../components/EmployeeModal';
import { formatCurrency } from '../utils/formatters';
import type { ContractType, Employee, EmployeeStatus } from '../types';

const contractLabels: Record<ContractType, string> = {
  TIEMPO_COMPLETO: 'Tiempo completo',
  MEDIO_TIEMPO: 'Medio tiempo',
  TEMPORAL: 'Temporal',
};

const Employees = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<EmployeeStatus | ''>('');
  const [department, setDepartment] = useState('');
  const [editing, setEditing] = useState<Employee | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [toDeactivate, setToDeactivate] = useState<Employee | null>(null);
  const [deactivating, setDeactivating] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getEmployees({ search, status, department });
      setEmployees(data);
    } catch {
      toast.error('No se pudieron cargar los empleados');
    } finally {
      setLoading(false);
    }
  }, [search, status, department]);

  useEffect(() => {
    void load();
  }, [load]);

  const departments = useMemo(
    () => Array.from(new Set(employees.map((employee) => employee.department))).sort(),
    [employees],
  );

  const openNew = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (employee: Employee) => {
    setEditing(employee);
    setModalOpen(true);
  };

  const confirmDeactivate = async () => {
    if (!toDeactivate) return;
    setDeactivating(true);
    try {
      await deactivateEmployee(toDeactivate.id);
      toast.success(`${toDeactivate.fullName} fue dado de baja`);
      setToDeactivate(null);
      await load();
    } catch {
      toast.error('No se pudo dar de baja al empleado');
    } finally {
      setDeactivating(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Empleados</h1>
          <p className="mt-1 text-sm text-slate-500">Administra el catálogo de personal</p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          <Plus size={17} /> Nuevo empleado
        </button>
      </div>

      <div className="mt-6 flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="relative min-w-[220px] flex-1">
          <Search
            size={17}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            placeholder="Buscar por nombre, correo o puesto"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <select
          className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-brand-600"
          value={status}
          onChange={(event) => setStatus(event.target.value as EmployeeStatus | '')}
        >
          <option value="">Todos los estados</option>
          <option value="ACTIVO">Activo</option>
          <option value="INACTIVO">Inactivo</option>
        </select>
        <select
          className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-brand-600"
          value={department}
          onChange={(event) => setDepartment(event.target.value)}
        >
          <option value="">Todos los departamentos</option>
          {departments.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[1000px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Puesto</th>
              <th className="px-4 py-3">Departamento</th>
              <th className="px-4 py-3">Tarifa/hora</th>
              <th className="px-4 py-3">Tipo contrato</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                  Cargando...
                </td>
              </tr>
            ) : employees.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                  No hay empleados con esos filtros.
                </td>
              </tr>
            ) : (
              employees.map((employee) => (
                <tr key={employee.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-800">{employee.fullName}</td>
                  <td className="px-4 py-3 text-slate-600">{employee.email}</td>
                  <td className="px-4 py-3 text-slate-600">{employee.position}</td>
                  <td className="px-4 py-3 text-slate-600">{employee.department}</td>
                  <td className="px-4 py-3 text-slate-600">{formatCurrency(employee.hourlyRate)}/h</td>
                  <td className="px-4 py-3 text-slate-600">
                    {contractLabels[employee.contractType]}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        employee.status === 'ACTIVO'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {employee.status === 'ACTIVO' ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(employee)}
                        title="Editar"
                        className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:border-brand-600 hover:text-brand-700"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setToDeactivate(employee)}
                        disabled={employee.status === 'INACTIVO'}
                        title="Dar de baja"
                        className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:border-red-300 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <UserX size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <EmployeeModal
          key={editing?.id ?? 'new'}
          employee={editing}
          onClose={() => setModalOpen(false)}
          onSaved={() => {
            setModalOpen(false);
            void load();
          }}
        />
      )}

      {toDeactivate && (
        <ConfirmDialog
          title="Dar de baja empleado"
          message={`¿Estás seguro de dar de baja a ${toDeactivate.fullName}? El registro se conserva como INACTIVO y no se elimina.`}
          confirmLabel="Dar de baja"
          loading={deactivating}
          onCancel={() => setToDeactivate(null)}
          onConfirm={() => void confirmDeactivate()}
        />
      )}
    </div>
  );
};

export default Employees;
