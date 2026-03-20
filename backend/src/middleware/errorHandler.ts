import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';

interface AppError extends Error {
  statusCode?: number;
  code?: number | string;
  errors?: Record<string, { message: string }>;
  keyPattern?: Record<string, unknown>;
}

/**
 * Global error handler — catches all errors bubbled up via next(err).
 * Returns a consistent { error, details? } shape.
 */
const errorHandler = (
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.entries(err.errors).map(([field, value]) => ({
      field,
      message: value.message,
    }));

    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details,
    });
    return;
  }

  if (err.code === 11000) {
    const hasMrn = Boolean(err.keyPattern && 'mrn' in err.keyPattern);
    res.status(409).json({
      success: false,
      error: hasMrn ? 'MRN already exists' : 'Duplicate key error',
    });
    return;
  }

  if (err instanceof mongoose.Error.CastError) {
    res.status(400).json({
      success: false,
      error: 'Invalid ID format',
    });
    return;
  }

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: err.message || 'Internal server error',
  });
};

export default errorHandler;
