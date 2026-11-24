import type { NextFunction, Request, Response } from 'express';
import type { Role } from '../types/enums';
import { verifyToken } from '../utils/jwt';

export interface AuthUser {
  id: number;
  email: string;
  role: Role;
  employeeId: number | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/** Verifica el header Authorization: Bearer <token>. */
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Se requiere un token de autenticación' });
    return;
  }

  const token = header.slice(7).trim();

  try {
    req.user = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ message: 'Token inválido o expirado' });
  }
};

/** Factory que restringe el acceso a los roles indicados. */
export const authorize =
  (...roles: Role[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'No autenticado' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ message: 'No tienes permisos para esta operación' });
      return;
    }

    next();
  };
