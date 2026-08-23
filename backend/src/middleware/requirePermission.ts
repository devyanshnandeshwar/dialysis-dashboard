import { Response, NextFunction, RequestHandler } from 'express';
import { AuthedRequest } from './auth';
import { Permission, roleHas } from '../config/permissions';
import { forbidden, unauthorized } from '../utils/errors';

/**
 * Gates a route on a single permission. Always mount behind `requireAuth` —
 * a missing `req.user` here means the route was wired without it, so this
 * fails closed with a 401 rather than silently allowing the request.
 *
 * 401 means "we do not know who you are", 403 means "we do, and the answer is
 * no". Keeping them distinct is what lets the frontend log a user out on 401
 * without also logging them out when they merely tapped something above their
 * role.
 */
const requirePermission = (permission: Permission): RequestHandler => {
  return (req, _res: Response, next: NextFunction) => {
    const { user } = req as AuthedRequest;

    if (!user) {
      return next(unauthorized('Authentication required'));
    }

    if (!roleHas(user.role, permission)) {
      return next(
        forbidden('You do not have permission to perform this action', {
          requiredPermission: permission,
          role: user.role,
        })
      );
    }

    return next();
  };
};

export default requirePermission;
