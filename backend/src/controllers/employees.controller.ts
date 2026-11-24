import type { Request, Response } from 'express';
import type { Prisma } from '@prisma/client';
import prisma from '../config/db';
import { AppError } from '../middleware/errorHandler';
import { ContractType, EmployeeStatus, Role } from '../types/enums';
import { dateKeyToDate, isValidDateKey } from '../utils/datetime';
import { asyncHandler } from '../utils/asyncHandler';
import { hashPassword } from '../utils/password';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const contractValues = Object.values(ContractType) as string[];
const statusValues = Object.values(EmployeeStatus) as string[];

const normalizeEmail = (value: string): string => value.trim().toLowerCase();

/** GET /api/employees */
export const listEmployees = asyncHandler(async (req: Request, res: Response) => {
  const { status, department, search } = req.query as Record<string, string | undefined>;
  const where: Prisma.EmployeeWhereInput = {};

  if (status) {
    if (!statusValues.includes(status)) throw new AppError(400, 'Estado no válido');
    where.status = status;
  }
  if (department?.trim()) where.department = { contains: department.trim() };
  if (search?.trim()) {
    where.OR = ['fullName', 'email', 'position', 'department'].map((field) => ({
      [field]: { contains: search.trim() },
    }));
  }

  const employees = await prisma.employee.findMany({
    where,
    include: { account: { select: { id: true, role: true } } },
    orderBy: { fullName: 'asc' },
  });

  res.json({ employees });
});

/** GET /api/employees/:id */
export const getEmployee = asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const employee = await prisma.employee.findUnique({
    where: { id },
    include: { account: { select: { id: true, email: true, role: true } } },
  });

  if (!employee) throw new AppError(404, 'Empleado no encontrado');
  res.json({ employee });
});

/** POST /api/employees */
export const createEmployee = asyncHandler(async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const fullName = String(body.fullName ?? '').trim();
  const rawEmail = String(body.email ?? '').trim();
  const position = String(body.position ?? '').trim();
  const department = String(body.department ?? '').trim();
  const hireDate = String(body.hireDate ?? '');
  const email = normalizeEmail(rawEmail);

  if (!fullName || !position || !department) {
    throw new AppError(400, 'Nombre, puesto y departamento son obligatorios');
  }
  if (!emailPattern.test(email)) throw new AppError(400, 'Correo electrónico no válido');
  if (!isValidDateKey(hireDate)) throw new AppError(400, 'Fecha de contratación no válida');

  const hourlyRate = Number(body.hourlyRate ?? 80);
  if (!Number.isFinite(hourlyRate) || hourlyRate < 0) {
    throw new AppError(400, 'La tarifa por hora debe ser un número positivo');
  }

  const contractType = String(body.contractType ?? ContractType.TIEMPO_COMPLETO);
  const status = String(body.status ?? EmployeeStatus.ACTIVO);
  if (!contractValues.includes(contractType)) throw new AppError(400, 'Tipo de contrato no válido');
  if (!statusValues.includes(status)) throw new AppError(400, 'Estado no válido');

  const createAccess = Boolean(body.createAccess);
  const password = String(body.password ?? '');
  if (createAccess && password.length < 6) {
    throw new AppError(400, 'La contraseña debe tener al menos 6 caracteres');
  }

  if (await prisma.employee.findUnique({ where: { email } })) {
    throw new AppError(409, 'Ya existe un empleado con ese correo');
  }
  if (createAccess && (await prisma.user.findUnique({ where: { email } }))) {
    throw new AppError(409, 'Ya existe un usuario con ese correo');
  }

  const employee = await prisma.$transaction(async (tx) => {
    const created = await tx.employee.create({
      data: {
        fullName,
        email,
        phone: String(body.phone ?? '').trim() || null,
        position,
        department,
        hireDate: dateKeyToDate(hireDate),
        hourlyRate,
        contractType,
        status,
      },
    });

    if (createAccess) {
      const user = await tx.user.create({
        data: {
          email,
          password: await hashPassword(password),
          role: Role.EMPLEADO,
          employeeId: created.id,
        },
      });
      return tx.employee.update({ where: { id: created.id }, data: { userId: user.id } });
    }

    return created;
  });

  res.status(201).json({ employee });
});

/** PUT /api/employees/:id */
export const updateEmployee = asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const existing = await prisma.employee.findUnique({
    where: { id },
    include: { account: true },
  });
  if (!existing) throw new AppError(404, 'Empleado no encontrado');

  const body = (req.body ?? {}) as Record<string, unknown>;
  const data: Prisma.EmployeeUpdateInput = {};

  if (body.fullName !== undefined) {
    const value = String(body.fullName).trim();
    if (!value) throw new AppError(400, 'El nombre no puede estar vacío');
    data.fullName = value;
  }
  if (body.email !== undefined) {
    const email = normalizeEmail(String(body.email));
    if (!emailPattern.test(email)) throw new AppError(400, 'Correo electrónico no válido');
    const other = await prisma.employee.findUnique({ where: { email } });
    if (other && other.id !== id) throw new AppError(409, 'Ya existe un empleado con ese correo');
    data.email = email;
  }
  if (body.phone !== undefined) data.phone = String(body.phone).trim() || null;
  if (body.position !== undefined) {
    const value = String(body.position).trim();
    if (!value) throw new AppError(400, 'El puesto no puede estar vacío');
    data.position = value;
  }
  if (body.department !== undefined) {
    const value = String(body.department).trim();
    if (!value) throw new AppError(400, 'El departamento no puede estar vacío');
    data.department = value;
  }
  if (body.hireDate !== undefined) {
    if (!isValidDateKey(body.hireDate)) throw new AppError(400, 'Fecha de contratación no válida');
    data.hireDate = dateKeyToDate(body.hireDate);
  }
  if (body.hourlyRate !== undefined) {
    const rate = Number(body.hourlyRate);
    if (!Number.isFinite(rate) || rate < 0) {
      throw new AppError(400, 'La tarifa por hora debe ser un número positivo');
    }
    data.hourlyRate = rate;
  }
  if (body.contractType !== undefined) {
    if (!contractValues.includes(String(body.contractType))) {
      throw new AppError(400, 'Tipo de contrato no válido');
    }
    data.contractType = String(body.contractType);
  }
  if (body.status !== undefined) {
    if (!statusValues.includes(String(body.status))) throw new AppError(400, 'Estado no válido');
    data.status = String(body.status);
  }

  const employee = await prisma.$transaction(async (tx) => {
    const updated = await tx.employee.update({ where: { id }, data });

    if (existing.account) {
      if (data.email) {
        await tx.user.update({ where: { id: existing.account.id }, data: { email: String(data.email) } });
      }
    } else if (body.createAccess) {
      const password = String(body.password ?? '');
      if (password.length < 6) {
        throw new AppError(400, 'La contraseña debe tener al menos 6 caracteres');
      }
      const user = await tx.user.create({
        data: {
          email: String(data.email ?? existing.email),
          password: await hashPassword(password),
          role: Role.EMPLEADO,
          employeeId: id,
        },
      });
      await tx.employee.update({ where: { id }, data: { userId: user.id } });
    }

    return updated;
  });

  res.json({ employee });
});

/** DELETE /api/employees/:id -> soft delete (INACTIVO). */
export const deactivateEmployee = asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const existing = await prisma.employee.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, 'Empleado no encontrado');

  const employee = await prisma.employee.update({
    where: { id },
    data: { status: EmployeeStatus.INACTIVO },
  });

  res.json({ employee });
});
