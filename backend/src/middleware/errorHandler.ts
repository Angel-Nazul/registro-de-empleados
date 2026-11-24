import type { NextFunction, Request, Response } from 'express';

/** Error de dominio con código HTTP y mensaje listo para el cliente. */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/** Middleware centralizado: todas las respuestas de error usan { message }. */
export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ message: err.message });
    return;
  }

  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({ message: 'Cuerpo JSON inválido' });
    return;
  }

  console.error('[error]', err);
  res.status(500).json({ message: 'Error interno del servidor' });
};
