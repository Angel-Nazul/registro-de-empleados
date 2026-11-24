import type { Request, Response } from 'express';
import prisma from '../config/db';
import { AppError } from '../middleware/errorHandler';
import { Role } from '../types/enums';
import { asyncHandler } from '../utils/asyncHandler';
import {
  dateKeyToDate,
  mexicoDateKey,
  toUTCDateKey,
} from '../utils/datetime';
import { calculateWeekPayroll, getWeekPayrolls, getWeekStart } from '../utils/payroll';
import { addDays } from '../utils/week';
import { isTardy } from '../utils/timeRecords';

const round2 = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

/** Lunes y domingo de la semana actual en llaves UTC. */
const currentWeek = () => {
  const monday = getWeekStart(new Date());
  const nextMonday = new Date(monday);
  nextMonday.setUTCDate(nextMonday.getUTCDate() + 7);
  return { monday, nextMonday, mondayKey: toUTCDateKey(monday) };
};

/** GET /api/dashboard/admin */
export const getAdminDashboard = asyncHandler(async (_req: Request, res: Response) => {
  const { monday, nextMonday, mondayKey } = currentWeek();

  const [activeEmployees, activeCount, weekRecords, payrolls] = await Promise.all([
    prisma.employee.findMany({ where: { status: 'ACTIVO' }, orderBy: { fullName: 'asc' } }),
    prisma.employee.count({ where: { status: 'ACTIVO' } }),
    prisma.timeRecord.findMany({
      where: { date: { gte: monday, lt: nextMonday } },
      include: { employee: { select: { fullName: true, department: true } } },
      orderBy: { date: 'desc' },
    }),
    getWeekPayrolls(mondayKey),
  ]);

  const weeklyHours = round2(
    weekRecords.reduce((sum, record) => sum + record.regularHours + record.overtimeHours, 0),
  );
  const weeklyPayroll = round2(payrolls.reduce((sum, row) => sum + row.netSalary, 0));

  const hoursMap = new Map<
    number,
    { employeeId: number; employee: string; regularHours: number; overtimeHours: number; totalHours: number }
  >();
  const tardinessMap = new Map<number, { employeeId: number; employee: string; department: string; count: number }>();

  for (const record of weekRecords) {
    const hours = hoursMap.get(record.employeeId) ?? {
      employeeId: record.employeeId,
      employee: record.employee.fullName,
      regularHours: 0,
      overtimeHours: 0,
      totalHours: 0,
    };
    hours.regularHours += record.regularHours;
    hours.overtimeHours += record.overtimeHours;
    hours.totalHours += record.regularHours + record.overtimeHours;
    hoursMap.set(record.employeeId, hours);

    if (isTardy(record.checkIn)) {
      const tardiness = tardinessMap.get(record.employeeId) ?? {
        employeeId: record.employeeId,
        employee: record.employee.fullName,
        department: record.employee.department,
        count: 0,
      };
      tardiness.count += 1;
      tardinessMap.set(record.employeeId, tardiness);
    }
  }

  // Últimos 7 días (hora México) con todas las horas sumadas, para la gráfica de líneas.
  const today = mexicoDateKey(new Date());
  const firstDay = addDays(today, -6);
  const endOfToday = dateKeyToDate(today);
  endOfToday.setUTCDate(endOfToday.getUTCDate() + 1);
  const recentRange = await prisma.timeRecord.findMany({
    where: { date: { gte: dateKeyToDate(firstDay), lt: endOfToday } },
  });
  const hoursByDayMap = new Map<string, number>();
  for (const record of recentRange) {
    const key = toUTCDateKey(record.date);
    hoursByDayMap.set(
      key,
      (hoursByDayMap.get(key) ?? 0) + record.regularHours + record.overtimeHours,
    );
  }
  const hoursByDay = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(today, index - 6);
    return { date, hours: round2(hoursByDayMap.get(date) ?? 0) };
  });

  const departmentMap = new Map<string, number>();
  for (const row of payrolls) {
    departmentMap.set(row.department, (departmentMap.get(row.department) ?? 0) + row.netSalary);
  }

  const recentRecords = weekRecords.slice(0, 5).map((record) => ({
    id: record.id,
    employee: record.employee.fullName,
    date: toUTCDateKey(record.date),
    hours: round2(record.regularHours + record.overtimeHours),
    overtimeHours: record.overtimeHours,
    hasTardiness: isTardy(record.checkIn),
  }));

  res.json({
    activeEmployees: activeCount,
    employees: activeEmployees.map(({ id, fullName, department, position }) => ({
      id,
      fullName,
      department,
      position,
    })),
    weeklyHours,
    weeklyPayroll,
    employeesWithTardiness: Array.from(tardinessMap.values()).sort((a, b) => b.count - a.count),
    recentRecords,
    hoursByEmployee: Array.from(hoursMap.values()).sort((a, b) => b.totalHours - a.totalHours),
    payrollByDepartment: Array.from(departmentMap, ([department, total]) => ({
      department,
      total: round2(total),
    })).sort((a, b) => b.total - a.total),
    hoursByDay,
    weekStart: mondayKey,
  });
});

/** GET /api/dashboard/employee */
export const getEmployeeDashboard = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;
  if (user.role !== Role.EMPLEADO || !user.employeeId) {
    throw new AppError(403, 'Tu usuario no tiene un empleado asociado');
  }
  const employeeId = user.employeeId;
  const { monday, nextMonday, mondayKey } = currentWeek();

  const [employee, weekRecords, payroll] = await Promise.all([
    prisma.employee.findUnique({ where: { id: employeeId } }),
    prisma.timeRecord.findMany({
      where: { employeeId, date: { gte: monday, lt: nextMonday } },
      orderBy: { date: 'desc' },
    }),
    calculateWeekPayroll(employeeId, mondayKey),
  ]);
  if (!employee) throw new AppError(404, 'Empleado no encontrado');

  const date = mexicoDateKey(new Date());
  const todayRecord = await prisma.timeRecord.findUnique({
    where: { employeeId_date: { employeeId, date: dateKeyToDate(date) } },
  });

  res.json({
    employee: {
      id: employee.id,
      fullName: employee.fullName,
      position: employee.position,
      department: employee.department,
    },
    weeklyHours: round2(
      weekRecords.reduce((sum, record) => sum + record.regularHours + record.overtimeHours, 0),
    ),
    weeklyEstimatedPay: payroll.netSalary,
    lastRecords: weekRecords.slice(0, 5).map((record) => ({
      id: record.id,
      date: toUTCDateKey(record.date),
      regularHours: record.regularHours,
      overtimeHours: record.overtimeHours,
      hasTardiness: isTardy(record.checkIn),
    })),
    todayStatus: { date, hasRecord: Boolean(todayRecord), timeRecord: todayRecord },
    weekStart: mondayKey,
  });
});
