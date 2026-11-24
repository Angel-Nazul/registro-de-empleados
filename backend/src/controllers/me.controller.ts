import type { Request, Response } from 'express';
import prisma from '../config/db';
import { AppError } from '../middleware/errorHandler';
import { Role } from '../types/enums';
import { asyncHandler } from '../utils/asyncHandler';
import {
  isValidMonthKey,
  mexicoDateKey,
  monthBounds,
  toUTCDateKey,
} from '../utils/datetime';
import { getPayrollHistory, getWeekStart, previewWeekPayroll } from '../utils/payroll';
import { isTardy } from '../utils/timeRecords';

const round2 = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

/** GET /api/me/summary?month=YYYY-MM — toda la información RH del empleado. */
export const getMySummary = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;
  if (user.role !== Role.EMPLEADO || !user.employeeId) {
    throw new AppError(403, 'Esta información es solo para empleados');
  }
  const employeeId = user.employeeId;
  const month = isValidMonthKey(req.query.month) ? req.query.month : mexicoDateKey(new Date()).slice(0, 7);
  if (!isValidMonthKey(month)) throw new AppError(400, 'month debe tener formato YYYY-MM');

  const { from, to } = monthBounds(month);
  const lastDay = new Date(to);
  lastDay.setUTCDate(lastDay.getUTCDate() - 1);

  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) throw new AppError(404, 'Empleado no encontrado');

  const records = await prisma.timeRecord.findMany({
    where: { employeeId, date: { gte: from, lt: to } },
    orderBy: { date: 'desc' },
  });

  const regularHours = round2(records.reduce((sum, record) => sum + record.regularHours, 0));
  const overtimeHours = round2(records.reduce((sum, record) => sum + record.overtimeHours, 0));

  // Descuentos de las semanas que se cruzan con el mes seleccionado.
  const weekStarts: Date[] = [];
  let cursor = getWeekStart(from);
  while (cursor <= lastDay) {
    weekStarts.push(new Date(cursor));
    const next = new Date(cursor);
    next.setUTCDate(next.getUTCDate() + 7);
    cursor = next;
  }
  const weekly = await Promise.all(
    weekStarts.map((weekStart) => previewWeekPayroll(employeeId, weekStart)),
  );

  const deductions = round2(
    weekly.reduce(
      (sum, row) => sum + row.tardinessDeduction + row.complianceDeduction + row.otherDeductions,
      0,
    ),
  );
  const grossSalary = round2(
    regularHours * employee.hourlyRate + overtimeHours * employee.hourlyRate * 1.5,
  );
  const payrolls = await getPayrollHistory(employeeId, 8);

  const profile = {
    id: employee.id,
    fullName: employee.fullName,
    email: employee.email,
    phone: employee.phone,
    position: employee.position,
    department: employee.department,
    hireDate: toUTCDateKey(employee.hireDate),
    hourlyRate: employee.hourlyRate,
    contractType: employee.contractType,
    status: employee.status,
  };

  res.json({
    month,
    employee: profile,
    profile,
    records: records.map((record) => ({
      id: record.id,
      date: toUTCDateKey(record.date),
      checkIn: record.checkIn,
      lunchOut: record.lunchOut,
      lunchIn: record.lunchIn,
      checkOut: record.checkOut,
      regularHours: record.regularHours,
      overtimeHours: record.overtimeHours,
      notes: record.notes,
      hasTardiness: isTardy(record.checkIn),
    })),
    recordTotals: {
      regularHours,
      overtimeHours,
      totalHours: round2(regularHours + overtimeHours),
      daysWorked: new Set(records.map((record) => toUTCDateKey(record.date))).size,
      tardinessCount: records.filter((record) => isTardy(record.checkIn)).length,
    },
    payrolls,
    monthly: {
      month,
      regularHours,
      overtimeHours,
      totalHours: round2(regularHours + overtimeHours),
      grossSalary,
      deductions,
      netSalary: round2(grossSalary - deductions),
      weeks: weekly.length,
    },
  });
});
