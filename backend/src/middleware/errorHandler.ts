import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { AppError } from '../utils/errors';

interface MongoDuplicateKeyError extends Error {
  code?: number | string;
  keyPattern?: Record<string, unknown>;
}

/**
 * Global error handler — catches all errors bubbled up via next(err).
 * Returns a consistent { success, error, details? } shape.
 */
const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      ...err.details,
    });
    return;
  }

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

  const { code, keyPattern } = err as MongoDuplicateKeyError;

  if (code === 11000) {
    const duplicatedKeys = Object.keys(keyPattern ?? {});

    if (duplicatedKeys.includes('mrn')) {
      res.status(409).json({ success: false, error: 'MRN already exists' });
      return;
    }

    if (duplicatedKeys.includes('patientId') && duplicatedKeys.includes('scheduledDay')) {
      res.status(409).json({
        success: false,
        error: 'Patient already has a session scheduled for this date',
      });
      return;
    }

    res.status(409).json({ success: false, error: 'Duplicate key error' });
    return;
  }

  if (err instanceof mongoose.Error.CastError) {
    res.status(400).json({
      success: false,
      error: 'Invalid ID format',
    });
    return;
  }

  // Anything reaching here is unexpected. Log it server-side and return a
  // generic message — err.message can carry connection strings and other
  // internals that must not reach the client.
  console.error('Unhandled error:', err);

  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
};

export default errorHandler;
