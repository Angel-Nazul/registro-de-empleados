import type { Request, Response } from 'express';
import prisma from '../config/db';
import { AppError } from '../middleware/errorHandler';
import { Role } from '../types/enums';
import { isValidDateKey, toUTCDateKey } from '../utils/datetime';
import { asyncHandler } from '../utils/asyncHandler';
import {
  calculateWeekPayroll,
  getPayrollHistory,
  getWeekPayrolls,
  type DeductionsInput,
} from '../utils/payroll';

const nonNegative = (value: unknown, field: string): number | undefined => {
  if (value === undefined) return undefined;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    throw new AppError(400, `${field} debe ser un monto positivo`);
  }
  return number;
};

/** GET /api/payroll/week/:weekStart */
export const getWeekPayroll = asyncHandler(async (req: Request, res: Response) => {
  const weekStart = String(req.params.weekStart ?? '');
  if (!isValidDateKey(weekStart)) {
    throw new AppError(400, 'weekStart debe tener formato YYYY-MM-DD (lunes)');
  }

  const user = req.user!;
  const employeeId = user.role === Role.EMPLEADO ? user.employeeId ?? undefined : undefined;
  if (user.role === Role.EMPLEADO && !employeeId) {
    throw new AppError(403, 'Tu usuario no tiene un empleado asociado');
  }

  const payrolls = await getWeekPayrolls(weekStart, employeeId);
  res.json({ weekStart: toUTCDateKey(new Date(`${weekStart}T00:00:00Z`)), payrolls });
});

/** PUT /api/payroll/:id (ADMIN) */
export const updatePayroll = asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const current = await prisma.weeklyPayroll.findUnique({ where: { id } });
  if (!current) throw new AppError(404, 'Registro de nómina no encontrado');

  const body = (req.body ?? {}) as Record<string, unknown>;
  const deductions: DeductionsInput = {
    tardinessDeduction: nonNegative(body.tardinessDeduction, 'Retardos'),
    complianceDeduction: nonNegative(body.complianceDeduction, 'Incumplimiento'),
    otherDeductions: nonNegative(body.otherDeductions, 'Otros descuentos'),
  };
  const hourlyRateOverride = nonNegative(body.hourlyRateOverride, 'Tarifa por hora');

  if (hourlyRateOverride !== undefined) {
    await prisma.employee.update({
      where: { id: current.employeeId },
      data: { hourlyRate: hourlyRateOverride },
    });
  }

  const payroll = await calculateWeekPayroll(current.employeeId, current.weekStart, {
    ...deductions,
    hourlyRateOverride,
  });

  res.json({ payroll });
});

/** GET /api/payroll/employee/:employeeId/history?weeks=8 */
export const getEmployeePayrollHistory = asyncHandler(async (req: Request, res: Response) => {
  const employeeId = Number(req.params.employeeId);
  const user = req.user!;

  if (user.role === Role.EMPLEADO && user.employeeId !== employeeId) {
    throw new AppError(403, 'Solo puedes consultar tu propio historial');
  }

  const requestedWeeks = Number(req.query.weeks ?? 8);
  const weeks = Math.min(Math.max(Number.isFinite(requestedWeeks) ? requestedWeeks : 8, 1), 52);
  const history = await getPayrollHistory(employeeId, weeks);

  res.json({ history });
});
