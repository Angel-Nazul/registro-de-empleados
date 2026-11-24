/**
 * SQLite no admite enums en Prisma, así que los valores se almacenan como
 * String y aquí exponemos constantes + uniones para tipar el código.
 */

export const Role = {
  ADMIN: 'ADMIN',
  EMPLEADO: 'EMPLEADO',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const ContractType = {
  TIEMPO_COMPLETO: 'TIEMPO_COMPLETO',
  MEDIO_TIEMPO: 'MEDIO_TIEMPO',
  TEMPORAL: 'TEMPORAL',
} as const;
export type ContractType = (typeof ContractType)[keyof typeof ContractType];

export const EmployeeStatus = {
  ACTIVO: 'ACTIVO',
  INACTIVO: 'INACTIVO',
} as const;
export type EmployeeStatus = (typeof EmployeeStatus)[keyof typeof EmployeeStatus];
