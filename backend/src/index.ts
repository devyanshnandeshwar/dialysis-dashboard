import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import connectDB from './config/db';
import patientRoutes from './routes/patientRoutes';
import sessionRoutes from './routes/sessionRoutes';
import machineRoutes from './routes/machineRoutes';
import authRoutes from './routes/authRoutes';
import requireAuth from './middleware/auth';
import errorHandler from './middleware/errorHandler';
import { forbidden } from './utils/errors';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';

// Behind a platform proxy (Render, Railway, Fly) the client IP arrives in
// X-Forwarded-For. Without this the rate limiter buckets every request under
// the proxy's IP and throttles all users as one.
if (isProduction) {
  app.set('trust proxy', 1);
}

app.use(helmet());

/**
 * CORS was `cors()` with no options, which answers every origin with
 * `Access-Control-Allow-Origin: *`. Combined with the API being unauthenticated
 * that let any website read and write the whole dataset from a visitor's
 * browser. Allow only the deployed frontend (plus local dev).
 */
const allowedOrigins = (process.env.FRONTEND_URL ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

if (!isProduction) {
  allowedOrigins.push('http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175');
}

app.use(
  cors({
    origin(origin, callback) {
      // No Origin header: same-origin, curl, or a server-to-server call.
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      // A plain Error here would fall through to the generic handler as a 500.
      // A disallowed origin is a client problem, so say so.
      return callback(forbidden('Origin not allowed'));
    },
    credentials: true,
  })
);

app.use(compression());
// Cap the body size. The default is 100kb, but being explicit keeps a large
// nurseNotes payload from being used to push memory around.
app.use(express.json({ limit: '100kb' }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please slow down' },
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);

// Everything below requires a valid bearer token.
app.use('/api/patients', apiLimiter, requireAuth, patientRoutes);
app.use('/api/sessions', apiLimiter, requireAuth, sessionRoutes);
app.use('/api/machines', apiLimiter, requireAuth, machineRoutes);

app.use(errorHandler);

const startServer = async () => {
  // Fail fast rather than serving traffic that cannot authenticate.
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error(
      'JWT_SECRET must be set to a random string of at least 32 characters'
    );
  }

  if (isProduction && allowedOrigins.length === 0) {
    throw new Error('FRONTEND_URL must be set in production so CORS is not open');
  }

  await connectDB();

  // Seeding drops every patient and session, so it never runs implicitly —
  // it requires an explicit opt-in and refuses to run outside development.
  if (process.env.SEED_ON_BOOT === 'true') {
    if (isProduction) {
      throw new Error('SEED_ON_BOOT is not allowed when NODE_ENV=production');
    }

    console.warn('SEED_ON_BOOT=true — dropping and reseeding all collections');
    const { seedDatabase } = require('./scripts/seed') as {
      seedDatabase: () => Promise<void>;
    };
    await seedDatabase();
  }

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`CORS allowed origins: ${allowedOrigins.join(', ') || '(none)'}`);
  });
};

startServer().catch((err) => {
  console.error('Failed to start server', err);
  process.exit(1);
});

export default app;
