import jwt, { SignOptions } from 'jsonwebtoken';
import type { Role } from '../types/enums';

export interface JwtPayload {
  id: number;
  email: string;
  role: Role;
  employeeId: number | null;
}

const JWT_SECRET = process.env.JWT_SECRET ?? 'rrhh_dev_secret_change_me';
const TOKEN_EXPIRATION: SignOptions['expiresIn'] = '8h';

export const signToken = (payload: JwtPayload): string =>
  jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRATION });

export const verifyToken = (token: string): JwtPayload =>
  jwt.verify(token, JWT_SECRET) as JwtPayload;
