import { useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import Modal from './Modal';
import { createEmployee, updateEmployee } from '../api/employees';
import { todayKey } from '../utils/week';
import type {
  ContractType,
  Employee,
  EmployeeFormValues,
  EmployeeStatus,
} from '../types';

interface EmployeeModalProps {
  employee: Employee | null;
  onClose: () => void;
  onSaved: (employee: Employee) => void;
}

const initialValues = (employee: Employee | null): EmployeeFormValues => ({
  fullName: employee?.fullName ?? '',
  email: employee?.email ?? '',
  phone: employee?.phone ?? '',
  position: employee?.position ?? '',
  department: employee?.department ?? '',
  hireDate: employee?.hireDate?.slice(0, 10) ?? todayKey(),
  hourlyRate: employee?.hourlyRate ?? 80,
  contractType: employee?.contractType ?? 'TIEMPO_COMPLETO',
  status: employee?.status ?? 'ACTIVO',
  createAccess: Boolean(employee?.account),
  password: '',
});

const inputClass =
  'w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100';

const EmployeeModal = ({ employee, onClose, onSaved }: EmployeeModalProps) => {
  const [values, setValues] = useState<EmployeeFormValues>(() => initialValues(employee));
  const [saving, setSaving] = useState(false);
  const hasAccess = Boolean(employee?.account);

  const set = <K extends keyof EmployeeFormValues>(key: K, value: EmployeeFormValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!values.fullName.trim() || !values.position.trim() || !values.department.trim()) {
      toast.error('Completa nombre, puesto y departamento');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
      toast.error('Ingresa un correo válido');
      return;
    }
    if (!values.hireDate) {
      toast.error('Selecciona la fecha de contratación');
      return;
    }
    if (!Number.isFinite(values.hourlyRate) || values.hourlyRate < 0) {
      toast.error('La tarifa por hora debe ser positiva');
      return;
    }
    if (values.createAccess && !hasAccess && values.password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    const payload: EmployeeFormValues = {
      ...values,
      email: values.email.trim().toLowerCase(),
      fullName: values.fullName.trim(),
      position: values.position.trim(),
      department: values.department.trim(),
      phone: values.phone.trim(),
      // Si el acceso ya existe no reenviamos una contraseña vacía.
      createAccess: values.createAccess && !hasAccess,
    };

    setSaving(true);
    try {
      const saved = employee
        ? await updateEmployee(employee.id, payload)
        : await createEmployee(payload);
      toast.success(employee ? 'Empleado actualizado' : 'Empleado creado');
      onSaved(saved);
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

  return (
    <Modal
      title={employee ? 'Editar empleado' : 'Nuevo empleado'}
      subtitle="Datos del expediente y acceso al sistema"
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
            form="employee-form"
            disabled={saving}
            className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </>
      }
    >
      <form id="employee-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-sm font-medium text-slate-700">Nombre completo</span>
            <input
              className={inputClass}
              value={values.fullName}
              onChange={(event) => set('fullName', event.target.value)}
              placeholder="Juan Pérez García"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Correo electrónico</span>
            <input
              type="email"
              className={inputClass}
              value={values.email}
              onChange={(event) => set('email', event.target.value)}
              placeholder="nombre@empresa.mx"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Teléfono</span>
            <input
              className={inputClass}
              value={values.phone}
              onChange={(event) => set('phone', event.target.value)}
              placeholder="55 1234 5678"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Puesto</span>
            <input
              className={inputClass}
              value={values.position}
              onChange={(event) => set('position', event.target.value)}
              placeholder="Desarrollador"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Departamento</span>
            <input
              className={inputClass}
              value={values.department}
              onChange={(event) => set('department', event.target.value)}
              placeholder="Sistemas"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Fecha de contratación</span>
            <input
              type="date"
              className={inputClass}
              value={values.hireDate}
              onChange={(event) => set('hireDate', event.target.value)}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Tarifa por hora (MXN)</span>
            <input
              type="number"
              min="0"
              step="0.01"
              className={inputClass}
              value={values.hourlyRate}
              onChange={(event) => set('hourlyRate', Number(event.target.value))}
            />
            <span className="mt-1 block text-xs text-slate-400">
              Default $80.00 MXN/h · Salario mínimo referencia: $278.80/día
            </span>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Tipo de contrato</span>
            <select
              className={inputClass}
              value={values.contractType}
              onChange={(event) => set('contractType', event.target.value as ContractType)}
            >
              <option value="TIEMPO_COMPLETO">Tiempo completo</option>
              <option value="MEDIO_TIEMPO">Medio tiempo</option>
              <option value="TEMPORAL">Temporal</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Estado</span>
            <select
              className={inputClass}
              value={values.status}
              onChange={(event) => set('status', event.target.value as EmployeeStatus)}
            >
              <option value="ACTIVO">Activo</option>
              <option value="INACTIVO">Inactivo</option>
            </select>
          </label>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4 accent-brand-600"
              checked={values.createAccess}
              disabled={hasAccess}
              onChange={(event) => set('createAccess', event.target.checked)}
            />
            Crear acceso al sistema
          </label>

          {hasAccess ? (
            <p className="mt-2 text-xs text-emerald-700">
              Este empleado ya tiene acceso con {employee?.email}.
            </p>
          ) : values.createAccess ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">Correo de acceso</span>
                <input className={inputClass} value={values.email} readOnly />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">Contraseña</span>
                <input
                  type="password"
                  className={inputClass}
                  value={values.password}
                  onChange={(event) => set('password', event.target.value)}
                  placeholder="Mínimo 6 caracteres"
                />
              </label>
            </div>
          ) : null}
        </div>
      </form>
    </Modal>
  );
};

export default EmployeeModal;
