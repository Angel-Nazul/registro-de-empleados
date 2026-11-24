import type { Request, Response } from 'express';
import type { Prisma } from '@prisma/client';
import prisma from '../config/db';
import { AppError } from '../middleware/errorHandler';
import { Role } from '../types/enums';
import {
  dateKeyToDate,
  isValidDateKey,
  isValidTime,
  mexicoDateKey,
  parseMexicoDateTime,
  toUTCDateKey,
} from '../utils/datetime';
import { asyncHandler } from '../utils/asyncHandler';
import { calculateHours, hasValidTimeOrder } from '../utils/timeRecords';

type TimeField = 'checkIn' | 'lunchOut' | 'lunchIn' | 'checkOut';
const timeFields: TimeField[] = ['checkIn', 'lunchOut', 'lunchIn', 'checkOut'];
const LUNCH_WARNING = '⚠ Comida fuera de 12:00–15:00 o duración distinta a 1 h';

/**
 * Admin puede elegir empleado; si no lo envía devuelve undefined = "todos".
 * EMPLEADO queda forzado a su propio id.
 */
const resolveEmployeeId = async (
  req: Request,
  requested: unknown,
): Promise<number | undefined> => {
  const user = req.user!;

  if (user.role === Role.EMPLEADO) {
    if (!user.employeeId) throw new AppError(403, 'Tu usuario no tiene un empleado asociado');
    if (requested !== undefined && Number(requested) !== user.employeeId) {
      throw new AppError(403, 'Solo puedes consultar tus propios registros');
    }
    return user.employeeId;
  }

  if (requested === undefined || requested === '') return undefined;
  const id = Number(requested);
  if (!Number.isInteger(id) || id <= 0) throw new AppError(400, 'employeeId no válido');
  if (!(await prisma.employee.findUnique({ where: { id } }))) {
    throw new AppError(404, 'Empleado no encontrado');
  }
  return id;
};

/** Convierte los cuatro campos de hora a instantes de America/Mexico_City. */
const parseTimes = (body: Record<string, unknown>, dateKey: string): Record<TimeField, Date> => {
  const result = {} as Record<TimeField, Date>;

  for (const field of timeFields) {
    if (!isValidTime(body[field])) {
      throw new AppError(400, `Hora inválida en ${field} (usa HH:mm)`);
    }
    result[field] = parseMexicoDateTime(dateKey, body[field] as string);
  }

  if (!hasValidTimeOrder(result.checkIn, result.lunchOut, result.lunchIn, result.checkOut)) {
    throw new AppError(400, 'La salida no puede ser anterior a la entrada');
  }

  return result;
};

/** GET /api/time-records */
export const listTimeRecords = asyncHandler(async (req: Request, res: Response) => {
  const requestedEmployeeId = req.query.employeeId as string | undefined;
  const employeeId = await resolveEmployeeId(req, requestedEmployeeId);

  const { from, to } = req.query as Record<string, string | undefined>;
  const where: Prisma.TimeRecordWhereInput = {};
  if (employeeId !== undefined) where.employeeId = employeeId;

  if (from) {
    if (!isValidDateKey(from)) throw new AppError(400, 'La fecha "from" no es válida');
    where.date = { ...(where.date as object), gte: dateKeyToDate(from) };
  }
  if (to) {
    if (!isValidDateKey(to)) throw new AppError(400, 'La fecha "to" no es válida');
    const nextDay = dateKeyToDate(to);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    where.date = { ...(where.date as object), lt: nextDay };
  }

  const timeRecords = await prisma.timeRecord.findMany({
    where,
    include: { employee: { select: { fullName: true } } },
    orderBy: { date: 'desc' },
  });

  res.json({ timeRecords });
});

/** GET /api/time-records/today */
export const getTodayRecord = asyncHandler(async (req: Request, res: Response) => {
  const employeeId = await resolveEmployeeId(req, req.query.employeeId);
  if (!employeeId) throw new AppError(400, 'Se requiere employeeId');
  const date = mexicoDateKey(new Date());

  const timeRecord = await prisma.timeRecord.findUnique({
    where: { employeeId_date: { employeeId, date: dateKeyToDate(date) } },
  });

  res.json({ date, hasRecord: Boolean(timeRecord), timeRecord });
});

/** POST /api/time-records */
export const createTimeRecord = asyncHandler(async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const employeeId = await resolveEmployeeId(req, body.employeeId);
  if (!employeeId) throw new AppError(400, 'Se requiere employeeId');
  const dateKey = String(body.date ?? '');

  if (!isValidDateKey(dateKey)) throw new AppError(400, 'La fecha del registro no es válida');
  if (
    await prisma.timeRecord.findUnique({
      where: { employeeId_date: { employeeId, date: dateKeyToDate(dateKey) } },
    })
  ) {
    throw new AppError(409, 'Ya existe un registro para esta fecha');
  }

  const times = parseTimes(body, dateKey);
  const hours = calculateHours(times.checkIn, times.lunchOut, times.lunchIn, times.checkOut);
  const notes = String(body.notes ?? '').trim();
  const finalNotes = hours.isValidLunch ? notes : [notes, LUNCH_WARNING].filter(Boolean).join(' · ');

  const timeRecord = await prisma.timeRecord.create({
    data: {
      employeeId,
      date: dateKeyToDate(dateKey),
      ...times,
      regularHours: hours.regularHours,
      overtimeHours: hours.overtimeHours,
      notes: finalNotes || null,
    },
  });

  res.status(201).json({
    timeRecord,
    warning: hours.isValidLunch ? null : LUNCH_WARNING,
  });
});

/** PUT /api/time-records/:id (solo ADMIN) */
export const updateTimeRecord = asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const existing = await prisma.timeRecord.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, 'Registro de horario no encontrado');

  const body = (req.body ?? {}) as Record<string, unknown>;
  const employeeId = await resolveEmployeeId(req, body.employeeId ?? existing.employeeId);
  if (!employeeId) throw new AppError(400, 'Se requiere employeeId');
  const dateKey = body.date === undefined ? toUTCDateKey(existing.date) : String(body.date);
  if (!isValidDateKey(dateKey)) throw new AppError(400, 'La fecha del registro no es válida');

  // El empleado solo puede corregir SU registro de hoy (antes de las 23:59).
  if (req.user!.role === Role.EMPLEADO) {
    const today = mexicoDateKey(new Date());
    if (existing.employeeId !== req.user!.employeeId || dateKey !== today) {
      throw new AppError(403, 'Solo puedes editar tu registro de hoy');
    }
  }

  if (dateKey !== toUTCDateKey(existing.date) || employeeId !== existing.employeeId) {
    const duplicate = await prisma.timeRecord.findUnique({
      where: { employeeId_date: { employeeId, date: dateKeyToDate(dateKey) } },
    });
    if (duplicate && duplicate.id !== id) {
      throw new AppError(409, 'Ya existe un registro para esta fecha');
    }
  }

  const times: Record<TimeField, Date> = {
    checkIn: existing.checkIn ?? parseMexicoDateTime(dateKey, '09:00'),
    lunchOut: existing.lunchOut ?? parseMexicoDateTime(dateKey, '13:00'),
    lunchIn: existing.lunchIn ?? parseMexicoDateTime(dateKey, '14:00'),
    checkOut: existing.checkOut ?? parseMexicoDateTime(dateKey, '18:00'),
  };
  for (const field of timeFields) {
    if (body[field] !== undefined) {
      if (!isValidTime(body[field])) throw new AppError(400, `Hora inválida en ${field} (usa HH:mm)`);
      times[field] = parseMexicoDateTime(dateKey, body[field] as string);
    }
  }
  if (!hasValidTimeOrder(times.checkIn, times.lunchOut, times.lunchIn, times.checkOut)) {
    throw new AppError(400, 'La salida no puede ser anterior a la entrada');
  }

  const hours = calculateHours(times.checkIn, times.lunchOut, times.lunchIn, times.checkOut);
  const rawNotes = body.notes === undefined ? existing.notes ?? '' : String(body.notes).trim();
  const notes = hours.isValidLunch
    ? rawNotes.replace(LUNCH_WARNING, '').replace(/\s*·\s*$/, '').trim()
    : [rawNotes.replace(LUNCH_WARNING, '').trim(), LUNCH_WARNING].filter(Boolean).join(' · ');

  const timeRecord = await prisma.timeRecord.update({
    where: { id },
    data: {
      employeeId,
      date: dateKeyToDate(dateKey),
      ...times,
      regularHours: hours.regularHours,
      overtimeHours: hours.overtimeHours,
      notes: notes || null,
    },
  });

  res.json({ timeRecord, warning: hours.isValidLunch ? null : LUNCH_WARNING });
});

/** DELETE /api/time-records/:id (solo ADMIN) */
export const deleteTimeRecord = asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!(await prisma.timeRecord.findUnique({ where: { id } }))) {
    throw new AppError(404, 'Registro de horario no encontrado');
  }

  await prisma.timeRecord.delete({ where: { id } });
  res.json({ message: 'Registro eliminado' });
});
