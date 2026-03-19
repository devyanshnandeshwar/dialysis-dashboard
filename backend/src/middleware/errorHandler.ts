import { Request, Response, NextFunction } from 'express';

interface AppError extends Error {
  statusCode?: number;
  code?: number; // Mongo duplicate-key code
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
  console.error('Error:', err.message);

  // Mongoose duplicate key (e.g. unique MRN)
  if (err.code === 11000) {
    res.status(409).json({ error: 'Duplicate key error', details: err.message });
    return;
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    res.status(400).json({ error: 'Validation error', details: err.message });
    return;
  }

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: err.message || 'Internal server error',
  });
};

export default errorHandler;
