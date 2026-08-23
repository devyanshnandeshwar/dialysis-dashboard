import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { unauthorized } from '../utils/errors';
import { Role } from '../config/permissions';

export interface TokenPayload {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface AuthedRequest extends Request {
  user?: TokenPayload;
}

/**
 * Read the signing secret at call time rather than module load, so a missing
 * JWT_SECRET fails loudly on the first request instead of silently signing
 * every token with `undefined`.
 */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error(
      'JWT_SECRET must be set to a random string of at least 32 characters'
    );
  }

  return secret;
}

export function signToken(payload: TokenPayload) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '12h' });
}

/**
 * Rejects any request without a valid bearer token. Applied to every /api
 * route except health and login -- before this existed, the entire patient
 * and session API was readable and writable by anyone who knew the URL.
 */
const requireAuth = (req: AuthedRequest, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    return next(unauthorized('Authentication required'));
  }

  const token = header.slice('Bearer '.length).trim();

  try {
    const decoded = jwt.verify(token, getJwtSecret()) as TokenPayload;
    req.user = {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role,
    };
    return next();
  } catch {
    // Deliberately generic: do not tell a caller whether the token was
    // malformed, expired, or signed with the wrong key.
    return next(unauthorized('Invalid or expired token'));
  }
};

export default requireAuth;
