import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import connectDB from './config/db';
import patientRoutes from './routes/patientRoutes';
import sessionRoutes from './routes/sessionRoutes';
import machineRoutes from './routes/machineRoutes';
import errorHandler from './middleware/errorHandler';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Routes
app.use('/api/patients', patientRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/machines', machineRoutes);

// Global error handler (must be after routes)
app.use(errorHandler);

const startServer = async () => {
  await connectDB();

  if (process.env.NODE_ENV === 'development') {
    const { seedDatabase } = require('./scripts/seed') as {
      seedDatabase: () => Promise<void>;
    };
    await seedDatabase();
  }

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(
      'Routes: GET /api/health, GET/POST/PATCH /api/patients, GET/POST/PATCH /api/sessions, GET /api/machines'
    );
  });
};

startServer().catch((err) => {
  console.error('Failed to start server', err);
  process.exit(1);
});

export default app;
