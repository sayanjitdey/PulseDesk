// apps/server/src/middleware/errorHandler.ts
import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { env } from '../config/env.js';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof AppError && err.isOperational) {
    return res.status(err.statusCode).json({
      error:   err.code,
      message: err.message,
      details: err.details,
    });
  }

  logger.error({ err, path: req.path, method: req.method }, 'Unhandled error');

  res.status(500).json({
    error:   'INTERNAL_SERVER_ERROR',
    message: env.NODE_ENV === 'production' ? 'Something went wrong' : err.message,
  });
}