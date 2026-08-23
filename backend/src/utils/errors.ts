/**
 * Error type carrying the HTTP status a failure should map to, so services can
 * signal intent without controllers having to match on message strings.
 */
export class AppError extends Error {
  statusCode: number;
  details?: Record<string, unknown> | undefined;

  constructor(
    message: string,
    statusCode: number,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace?.(this, AppError);
  }
}

export const badRequest = (message: string, details?: Record<string, unknown>) =>
  new AppError(message, 400, details);

export const notFound = (message: string, details?: Record<string, unknown>) =>
  new AppError(message, 404, details);

export const conflict = (message: string, details?: Record<string, unknown>) =>
  new AppError(message, 409, details);

export const unauthorized = (message: string, details?: Record<string, unknown>) =>
  new AppError(message, 401, details);

export const forbidden = (message: string, details?: Record<string, unknown>) =>
  new AppError(message, 403, details);
