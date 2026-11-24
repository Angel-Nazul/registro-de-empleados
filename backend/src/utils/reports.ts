import type { Request } from 'express';
import type { Prisma } from '@prisma/client';
import prisma from '../config/db';
import { AppError } from '../middleware/errorHandler';
import {
  dateKeyToDate,
  formatMexicoTime,
  isValidDateKey,
  toUTCDateKey,
} from './datetime';
import { getWeekStart } from './payroll';
import { calculateHours, isTardy } from './timeRecords';

export interface ReportFilters {
  from: string;
  to: string;
  employeeId?: number;
  department?: string;
}

export interface AttendanceRow {
  employeeId: number;
  employee: string;
  department: string;
  position: string;
  date: string;
  checkIn: string | null;
  lunchOut: string | null;
  lunchIn: string | null;
  checkOut: string | null;
  regularHours: number;
  overtimeHours: number;
  hasLunchIssue: boolean;
  hasTardiness: boolean;
  notes: string | null;
}

export interface AttendanceSummaryRow {
  employeeId: number;
  employee: string;
  department: string;
  daysWorked: number;
  regularHours: number;
  overtimeHours: number;
  totalHours: number;
  tardinessCount: number;
  tardinessDeduction: number;
  otherDeductions: number;
  netSalary: number;
}

const round2 = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

/** Rango por defecto: semana laboral actual (lunes a domingo, hora México). */
export const parseReportFilters = (query: Request['query']): ReportFilters => {
  const monday = getWeekStart(new Date());
  const sunday = new Date(monday);
  sunday.setUTCDate(sunday.getUTCDate() + 6);

  const from = query.from === undefined || query.from === '' ? toUTCDateKey(monday) : String(query.from);
  const to = query.to === undefined || query.to === '' ? toUTCDateKey(sunday) : String(query.to);

  if (!isValidDateKey(from) || !isValidDateKey(to)) {
    throw new AppError(400, 'El rango de fechas debe tener formato YYYY-MM-DD');
  }
  if (from > to) throw new AppError(400, 'La fecha inicial no puede ser posterior a la final');

  let employeeId: number | undefined;
  if (query.employeeId !== undefined && query.employeeId !== '') {
    employeeId = Number(query.employeeId);
    if (!Number.isInteger(employeeId) || employeeId <= 0) {
      throw new AppError(400, 'employeeId no válido');
    }
  }

  const department = typeof query.department === 'string' ? query.department.trim() : '';

  return { from, to, ...(employeeId ? { employeeId } : {}), ...(department ? { department } : {}) };
};

/** Filas de asistencia con horas calculadas y banderas de retardo / comida. */
export const getAttendanceRows = async (filters: ReportFilters): Promise<AttendanceRow[]> => {
  const nextDay = dateKeyToDate(filters.to);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);

  const where: Prisma.TimeRecordWhereInput = {
    date: { gte: dateKeyToDate(filters.from), lt: nextDay },
    ...(filters.employeeId ? { employeeId: filters.employeeId } : {}),
  };

  const records = await prisma.timeRecord.findMany({
    where,
    include: { employee: true },
    orderBy: [{ date: 'asc' }, { employee: { fullName: 'asc' } }],
  });

  const department = filters.department?.toLocaleLowerCase('es-MX');
  const filtered = department
    ? records.filter((record) =>
        record.employee.department.toLocaleLowerCase('es-MX').includes(department),
      )
    : records;

  return filtered.map((record) => {
    const hours = calculateHours(
      record.checkIn,
      record.lunchOut,
      record.lunchIn,
      record.checkOut,
    );

    return {
      employeeId: record.employeeId,
      employee: record.employee.fullName,
      department: record.employee.department,
      position: record.employee.position,
      date: toUTCDateKey(record.date),
      checkIn: formatMexicoTime(record.checkIn),
      lunchOut: formatMexicoTime(record.lunchOut),
      lunchIn: formatMexicoTime(record.lunchIn),
      checkOut: formatMexicoTime(record.checkOut),
      regularHours: hours.regularHours,
      overtimeHours: hours.overtimeHours,
      hasLunchIssue: !hours.isValidLunch,
      hasTardiness: isTardy(record.checkIn),
      notes: record.notes,
    };
  });
};

/** Totales por empleado, incluyendo descuentos de nómina en el rango. */
export const getAttendanceSummary = async (
  rows: AttendanceRow[],
  filters: ReportFilters,
): Promise<AttendanceSummaryRow[]> => {
  const byEmployee = new Map<number, AttendanceSummaryRow>();

  for (const row of rows) {
    let current = byEmployee.get(row.employeeId);
    if (!current) {
      current = {
        employeeId: row.employeeId,
        employee: row.employee,
        department: row.department,
        daysWorked: 0,
        regularHours: 0,
        overtimeHours: 0,
        totalHours: 0,
        tardinessCount: 0,
        tardinessDeduction: 0,
        otherDeductions: 0,
        netSalary: 0,
      };
      byEmployee.set(row.employeeId, current);
    }

    current.daysWorked += 1;
    current.regularHours += row.regularHours;
    current.overtimeHours += row.overtimeHours;
    if (row.hasTardiness) current.tardinessCount += 1;
  }

  // Semanas (lunes) que se cruzan con el rango para tomar sus descuentos.
  const firstMonday = getWeekStart(filters.from);
  const lastDate = dateKeyToDate(filters.to);
  const weekStarts: Date[] = [];
  for (let cursor = new Date(firstMonday); cursor <= lastDate; cursor.setUTCDate(cursor.getUTCDate() + 7)) {
    weekStarts.push(new Date(cursor));
  }

  const employeeIds = Array.from(byEmployee.keys());
  const payrolls = employeeIds.length
    ? await prisma.weeklyPayroll.findMany({
        where: { employeeId: { in: employeeIds }, weekStart: { in: weekStarts } },
      })
    : [];

  for (const payroll of payrolls) {
    const current = byEmployee.get(payroll.employeeId);
    if (!current) continue;
    current.tardinessDeduction += payroll.tardinessDeduction;
    current.otherDeductions += payroll.complianceDeduction + payroll.otherDeductions;
    current.netSalary += payroll.netSalary;
  }

  return Array.from(byEmployee.values())
    .sort((a, b) => a.employee.localeCompare(b.employee, 'es-MX'))
    .map((row) => ({
      ...row,
      regularHours: round2(row.regularHours),
      overtimeHours: round2(row.overtimeHours),
      totalHours: round2(row.regularHours + row.overtimeHours),
      tardinessDeduction: round2(row.tardinessDeduction),
      otherDeductions: round2(row.otherDeductions),
      netSalary: round2(row.netSalary),
    }));
};
