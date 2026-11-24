import prisma from '../config/db';
import { AppError } from '../middleware/errorHandler';
import { dateKeyToDate, isValidDateKey, toUTCDateKey } from './datetime';

export interface PayrollRow {
  id: number;
  employeeId: number;
  employeeName: string;
  position: string;
  department: string;
  status: string;
  weekStart: string;
  regularHours: number;
  overtimeHours: number;
  hourlyRate: number;
  baseSalary: number;
  overtimePay: number;
  tardinessDeduction: number;
  complianceDeduction: number;
  otherDeductions: number;
  netSalary: number;
  daysWorked: number;
}

export interface DeductionsInput {
  tardinessDeduction?: number;
  complianceDeduction?: number;
  otherDeductions?: number;
}

const round2 = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

/** Semana laboral mexicana: lunes a domingo. Devuelve el lunes en medianoche UTC. */
export const getWeekStart = (date: Date | string): Date => {
  const parsed =
    typeof date === 'string'
      ? isValidDateKey(date)
        ? dateKeyToDate(date)
        : new Date(date)
      : date;

  if (Number.isNaN(parsed.getTime())) {
    throw new AppError(400, 'La fecha de la semana no es válida');
  }

  const monday = new Date(
    Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()),
  );
  const day = monday.getUTCDay(); // 0 = domingo
  monday.setUTCDate(monday.getUTCDate() + (day === 0 ? -6 : 1 - day));
  return monday;
};

/**
 * Calcula la nómina de una semana sin escribir en la BD.
 * Útil para consultas (resumen mensual) que no deben generar filas vacías.
 */
export const previewWeekPayroll = async (
  employeeId: number,
  weekStartInput: Date | string,
  options: DeductionsInput & { hourlyRateOverride?: number } = {},
): Promise<PayrollRow> => {
  const weekStart = getWeekStart(weekStartInput);
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

  const [employee, records, existing] = await Promise.all([
    prisma.employee.findUnique({ where: { id: employeeId } }),
    prisma.timeRecord.findMany({
      where: { employeeId, date: { gte: weekStart, lt: weekEnd } },
    }),
    prisma.weeklyPayroll.findUnique({
      where: { employeeId_weekStart: { employeeId, weekStart } },
    }),
  ]);

  if (!employee) throw new AppError(404, 'Empleado no encontrado');

  // Horas: regulares tope 8/día; extra ya viene calculada en cada registro.
  const regularHours = round2(records.reduce((sum, record) => sum + record.regularHours, 0));
  const overtimeHours = round2(records.reduce((sum, record) => sum + record.overtimeHours, 0));

  const hourlyRate =
    options.hourlyRateOverride !== undefined ? Number(options.hourlyRateOverride) : employee.hourlyRate;
  const tardinessDeduction = options.tardinessDeduction ?? existing?.tardinessDeduction ?? 0;
  const complianceDeduction = options.complianceDeduction ?? existing?.complianceDeduction ?? 0;
  const otherDeductions = options.otherDeductions ?? existing?.otherDeductions ?? 0;

  const baseSalary = round2(regularHours * hourlyRate);
  const overtimePay = round2(overtimeHours * hourlyRate * 1.5);
  const netSalary = round2(
    baseSalary + overtimePay - tardinessDeduction - complianceDeduction - otherDeductions,
  );

  return {
    id: existing?.id ?? 0,
    employeeId,
    employeeName: employee.fullName,
    position: employee.position,
    department: employee.department,
    status: employee.status,
    weekStart: toUTCDateKey(weekStart),
    regularHours,
    overtimeHours,
    hourlyRate: round2(hourlyRate),
    baseSalary,
    overtimePay,
    tardinessDeduction: round2(tardinessDeduction),
    complianceDeduction: round2(complianceDeduction),
    otherDeductions: round2(otherDeductions),
    netSalary,
    daysWorked: new Set(records.map((record) => toUTCDateKey(record.date))).size,
  };
};

/**
 * Calcula y persiste la nómina de una semana (upsert) para poder editar descuentos.
 */
export const calculateWeekPayroll = async (
  employeeId: number,
  weekStartInput: Date | string,
  options: DeductionsInput & { hourlyRateOverride?: number } = {},
): Promise<PayrollRow> => {
  const preview = await previewWeekPayroll(employeeId, weekStartInput, options);
  const weekStart = getWeekStart(weekStartInput);

  const saved = await prisma.weeklyPayroll.upsert({
    where: { employeeId_weekStart: { employeeId, weekStart } },
    create: {
      employeeId,
      weekStart,
      baseSalary: preview.baseSalary,
      overtimePay: preview.overtimePay,
      tardinessDeduction: preview.tardinessDeduction,
      complianceDeduction: preview.complianceDeduction,
      otherDeductions: preview.otherDeductions,
      netSalary: preview.netSalary,
    },
    update: {
      baseSalary: preview.baseSalary,
      overtimePay: preview.overtimePay,
      tardinessDeduction: preview.tardinessDeduction,
      complianceDeduction: preview.complianceDeduction,
      otherDeductions: preview.otherDeductions,
      netSalary: preview.netSalary,
    },
  });

  return { ...preview, id: saved.id };
};

/** Nómina completa de una semana (todos los activos o un empleado). */
export const getWeekPayrolls = async (
  weekStartInput: Date | string,
  employeeId?: number,
): Promise<PayrollRow[]> => {
  const employees = await prisma.employee.findMany({
    where: employeeId ? { id: employeeId } : { status: 'ACTIVO' },
    orderBy: { fullName: 'asc' },
  });

  return Promise.all(employees.map((employee) => calculateWeekPayroll(employee.id, weekStartInput)));
};

/** Historial persistido de las últimas N semanas. No crea filas vacías. */
export const getPayrollHistory = async (
  employeeId: number,
  weeks = 8,
): Promise<PayrollRow[]> => {
  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) throw new AppError(404, 'Empleado no encontrado');

  const firstMonday = getWeekStart(new Date());
  const lowerBound = new Date(firstMonday);
  lowerBound.setUTCDate(lowerBound.getUTCDate() - (weeks - 1) * 7);

  const stored = await prisma.weeklyPayroll.findMany({
    where: {
      employeeId,
      weekStart: { gte: lowerBound, lte: firstMonday },
    },
    orderBy: { weekStart: 'desc' },
  });

  return Promise.all(
    stored.map(async (row) => {
      const weekEnd = new Date(row.weekStart);
      weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);
      const records = await prisma.timeRecord.findMany({
        where: { employeeId, date: { gte: row.weekStart, lt: weekEnd } },
      });
      const regularHours = round2(records.reduce((sum, record) => sum + record.regularHours, 0));
      const overtimeHours = round2(records.reduce((sum, record) => sum + record.overtimeHours, 0));

      return {
        id: row.id,
        employeeId,
        employeeName: employee.fullName,
        position: employee.position,
        department: employee.department,
        status: employee.status,
        weekStart: toUTCDateKey(row.weekStart),
        regularHours,
        overtimeHours,
        hourlyRate: round2(employee.hourlyRate),
        baseSalary: round2(row.baseSalary),
        overtimePay: round2(row.overtimePay),
        tardinessDeduction: round2(row.tardinessDeduction),
        complianceDeduction: round2(row.complianceDeduction),
        otherDeductions: round2(row.otherDeductions),
        netSalary: round2(row.netSalary),
        daysWorked: new Set(records.map((record) => toUTCDateKey(record.date))).size,
      };
    }),
  );
};

/** Formato MXN para respuestas o logs del backend. */
export const formatMXN = (amount: number): string =>
  `$${round2(amount).toLocaleString('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} MXN`;
