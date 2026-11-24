import type { Request, Response } from 'express';
import prisma from '../config/db';
import { AppError } from '../middleware/errorHandler';
import { signToken } from '../utils/jwt';
import { comparePassword } from '../utils/password';
import { asyncHandler } from '../utils/asyncHandler';
import type { Role } from '../types/enums';

/** POST /api/auth/login */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = (req.body ?? {}) as { email?: string; password?: string };

  if (!email || !password) {
    throw new AppError(400, 'El correo y la contraseña son obligatorios');
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  // Se compara siempre para no filtrar si el correo existe (timing attack).
  const validPassword = user ? await comparePassword(password, user.password) : false;

  if (!user || !validPassword) {
    throw new AppError(401, 'Credenciales inválidas');
  }

  const token = signToken({
    id: user.id,
    email: user.email,
    role: user.role as Role,
    employeeId: user.employeeId,
  });

  res.status(200).json({
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role as Role,
      employeeId: user.employeeId,
    },
  });
});

/** GET /api/auth/me */
export const me = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, 'No autenticado');
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      email: true,
      role: true,
      employeeId: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new AppError(404, 'Usuario no encontrado');
  }

  res.status(200).json({ user });
});
