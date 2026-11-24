import type { NextFunction, Request, RequestHandler, Response } from 'express';

// Express 4 no captura promesas rechazadas: las reenviamos al errorHandler.
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
