import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import { body } from 'express-validator';
import validate from '../middleware/validate';
import requireAuth, { AuthedRequest, signToken } from '../middleware/auth';
import User from '../models/User';
import { unauthorized } from '../utils/errors';
import { permissionsFor } from '../config/permissions';

const router = Router();

/**
 * Tighter than the global limiter: credential stuffing is the thing worth
 * throttling hardest, and a real user logs in once or twice a session.
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, error: 'Too many login attempts, try again later' },
});

router.post(
  '/login',
  loginLimiter,
  validate([
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isString().notEmpty().withMessage('Password required'),
  ]),
  async (req, res, next) => {
    try {
      const { email, password } = req.body;

      // passwordHash is `select: false` on the schema, so ask for it here.
      const user = await User.findOne({ email }).select('+passwordHash');

      // Compare against a dummy hash when the user is missing so that a
      // wrong email and a wrong password take the same time. Skipping this
      // turns login into a user-enumeration oracle.
      const hash =
        user?.passwordHash ??
        '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidiu';
      const ok = await bcrypt.compare(password, hash);

      if (!user || !ok) {
        return next(unauthorized('Invalid email or password'));
      }

      const token = signToken({
        id: String(user._id),
        email: user.email,
        name: user.name,
        role: user.role,
      });

      // Ship the resolved permission list with the identity so the client never
      // has to keep its own copy of the role table.
      res.json({
        token,
        user: {
          id: String(user._id),
          email: user.email,
          name: user.name,
          role: user.role,
          permissions: permissionsFor(user.role),
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * Lets the frontend confirm a stored token is still valid on boot, and is the
 * only place the client learns its permissions. Resolved from the role on every
 * call rather than read out of the token, so editing ROLE_PERMISSIONS takes
 * effect on the next request instead of waiting for tokens to expire.
 */
router.get('/me', requireAuth, (req: AuthedRequest, res) => {
  const user = req.user!;

  res.json({
    user: { ...user, permissions: permissionsFor(user.role) },
  });
});

export default router;
