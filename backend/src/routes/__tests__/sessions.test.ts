import request from 'supertest';
import express from 'express';
import sessionRoutes from '../sessionRoutes';
import errorHandler from '../../middleware/errorHandler';
import { AuthedRequest } from '../../middleware/auth';
import { Role } from '../../config/permissions';
import DialysisSession from '../../models/Session';
import Patient from '../../models/Patient';

// Mock the anomaly detector to prevent complex logic during route tests
jest.mock('../../utils/anomalyDetector', () => ({
  __esModule: true,
  default: jest.fn(() => [{ type: 'mock_anomaly', severity: 'warning', message: 'test' }])
}));

// Every route is behind requirePermission, which reads req.user. In production
// requireAuth puts it there; here we stand in for it so these tests stay focused
// on route behaviour. `actingRole` lets a case switch identity mid-suite.
let actingRole: Role = 'nurse';

// Mounting the real error handler means these tests exercise the same
// error -> status mapping production uses, rather than a route-only subset.
const app = express();
app.use(express.json());
app.use((req, _res, next) => {
  (req as AuthedRequest).user = {
    id: 'acting-user-id',
    email: 'acting@example.com',
    name: 'Acting User',
    role: actingRole,
  };
  next();
});
app.use('/api/sessions', sessionRoutes);
app.use(errorHandler);

const validSessionBody = () => ({
  patientId: 'mock-patient-id',
  machineId: 'HD-01',
  scheduledDate: new Date().toISOString(),
  status: 'in_progress',
  targetDurationMinutes: 240,
  preWeight: 75,
  preBloodPressure: { systolic: 140, diastolic: 90 },
});

describe('Session API Routes', () => {
  // Defaults are re-applied per test so individual cases can override a single
  // call (e.g. make the duplicate lookup return a hit) without leaking into others.
  beforeEach(() => {
    jest.restoreAllMocks();
    actingRole = 'nurse';

    jest.spyOn(Patient, 'findById').mockResolvedValue({
      _id: 'mock-patient-id',
      dryWeight: 70,
    } as any);

    jest.spyOn(DialysisSession, 'countDocuments').mockResolvedValue(0);
    jest.spyOn(DialysisSession, 'findOne').mockResolvedValue(null);

    jest.spyOn(DialysisSession, 'create').mockImplementation((data: any) => Promise.resolve({
      _id: 'mock-session-id',
      ...data,
    }) as any);

    jest.spyOn(DialysisSession, 'find').mockReturnValue({
      populate: jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue([
          {
            _id: 'mock-session-id',
            queuePosition: 1,
            status: 'in_progress',
            anomalies: [],
          },
        ]),
      }),
    } as any);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('POST /api/sessions', () => {
    it('creates a session with a valid body -> 201 with empty anomalies', async () => {
      const res = await request(app).post('/api/sessions').send(validSessionBody());

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('_id', 'mock-session-id');
      expect(res.body.anomalies).toHaveLength(0);
    });

    it('persists the derived scheduledDay alongside scheduledDate', async () => {
      const scheduledDate = new Date();
      await request(app)
        .post('/api/sessions')
        .send({ ...validSessionBody(), scheduledDate: scheduledDate.toISOString() });

      const created = (DialysisSession.create as jest.Mock).mock.calls[0]![0];
      const expectedDay = [
        scheduledDate.getFullYear(),
        String(scheduledDate.getMonth() + 1).padStart(2, '0'),
        String(scheduledDate.getDate()).padStart(2, '0'),
      ].join('-');

      expect(created.scheduledDay).toBe(expectedDay);
    });

    it('rejects a missing patientId -> 400', async () => {
      const res = await request(app)
        .post('/api/sessions')
        .send({ scheduledDate: new Date().toISOString() });

      expect(res.status).toBe(400);
      expect(res.body.details).toBeDefined();
      expect(res.body.details[0].msg).toBe('Patient ID is required');
    });

    it('rejects a session for a patient who already has one that day -> 409', async () => {
      jest
        .spyOn(DialysisSession, 'findOne')
        .mockResolvedValueOnce({ _id: 'existing-session-id' } as any);

      const res = await request(app).post('/api/sessions').send(validSessionBody());

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('Patient already has a session scheduled for this date');
      expect(res.body.existingSessionId).toBe('existing-session-id');
    });

    it('rejects a machine already assigned that day -> 409', async () => {
      jest
        .spyOn(DialysisSession, 'findOne')
        .mockResolvedValueOnce(null) // no duplicate for this patient
        .mockResolvedValueOnce({ _id: 'other-session-id' } as any); // machine busy

      const res = await request(app).post('/api/sessions').send(validSessionBody());

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('Machine already assigned to another session today');
      expect(res.body.machineId).toBe('HD-01');
    });

    it('translates a duplicate-key race into the same 409 as the pre-check', async () => {
      jest.spyOn(DialysisSession, 'create').mockRejectedValueOnce(
        Object.assign(new Error('E11000 duplicate key'), { code: 11000 })
      );
      jest
        .spyOn(DialysisSession, 'findOne')
        .mockResolvedValueOnce(null) // duplicate pre-check passes
        .mockResolvedValueOnce(null) // machine free
        .mockResolvedValueOnce({ _id: 'winner-session-id' } as any); // post-race lookup

      const res = await request(app).post('/api/sessions').send(validSessionBody());

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('Patient already has a session scheduled for this date');
      expect(res.body.existingSessionId).toBe('winner-session-id');
    });

    it('rejects a session scheduled in the past -> 400', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const res = await request(app)
        .post('/api/sessions')
        .send({ ...validSessionBody(), scheduledDate: pastDate.toISOString() });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Cannot schedule a session in the past');
    });

    it('rejects a session more than 30 days out -> 400', async () => {
      const farFuture = new Date();
      farFuture.setDate(farFuture.getDate() + 31);

      const res = await request(app)
        .post('/api/sessions')
        .send({ ...validSessionBody(), scheduledDate: farFuture.toISOString() });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Cannot schedule more than 30 days in advance');
    });

    it('returns 404 when the patient does not exist', async () => {
      jest.spyOn(Patient, 'findById').mockResolvedValue(null as any);

      const res = await request(app).post('/api/sessions').send(validSessionBody());

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Patient not found');
    });
  });

  describe('PATCH /api/sessions/:id', () => {
    it('refuses to start a session with no pre-session weight -> 400', async () => {
      jest.spyOn(DialysisSession, 'findById').mockResolvedValue({
        _id: 'mock-session-id',
        machineId: 'HD-01',
        preWeight: null,
      } as any);

      const res = await request(app)
        .patch('/api/sessions/mock-session-id')
        .send({ status: 'in_progress' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Cannot start session — pre-session weight is required');
    });

    it('returns 404 for an unknown session', async () => {
      jest.spyOn(DialysisSession, 'findById').mockResolvedValue(null as any);

      const res = await request(app)
        .patch('/api/sessions/mock-session-id')
        .send({ status: 'in_progress' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Session not found');
    });

    it('rejects a status this endpoint does not own -> 400', async () => {
      const res = await request(app)
        .patch('/api/sessions/mock-session-id')
        .send({ status: 'completed' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });
  });

  describe('PATCH /api/sessions/:id/complete', () => {
    it('stores detected anomalies and marks the session completed', async () => {
      const saved = { save: jest.fn().mockResolvedValue(undefined) } as any;
      const sessionDoc = {
        _id: 'mock-session-id',
        machineId: 'HD-01',
        scheduledDate: new Date(),
        preWeight: 75,
        targetDurationMinutes: 240,
        patientId: { dryWeight: 70 },
        ...saved,
      };

      jest
        .spyOn(DialysisSession, 'findById')
        .mockReturnValueOnce({
          populate: jest.fn().mockResolvedValue(sessionDoc),
        } as any)
        .mockReturnValueOnce({
          populate: jest.fn().mockResolvedValue({
            ...sessionDoc,
            status: 'completed',
            anomalies: [{ type: 'mock_anomaly', severity: 'warning', message: 'test' }],
          }),
        } as any);

      const res = await request(app)
        .patch('/api/sessions/mock-session-id/complete')
        .send({
          postWeight: 72,
          postBloodPressure: { systolic: 130, diastolic: 80 },
          sessionDurationMinutes: 235,
        });

      expect(res.status).toBe(200);
      expect(sessionDoc.status).toBe('completed');
      expect(sessionDoc.save).toHaveBeenCalled();
      expect(res.body.anomalies).toHaveLength(1);
    });

    it('rejects a non-positive post weight -> 400', async () => {
      const res = await request(app)
        .patch('/api/sessions/mock-session-id/complete')
        .send({
          postWeight: 0,
          postBloodPressure: { systolic: 130, diastolic: 80 },
          sessionDurationMinutes: 235,
        });

      expect(res.status).toBe(400);
      expect(res.body.details[0].msg).toBe('Post-session weight must be greater than 0');
    });
  });

  describe('PATCH /api/sessions/:id/queue', () => {
    it('rejects an unrecognised direction -> 400', async () => {
      const res = await request(app)
        .patch('/api/sessions/mock-session-id/queue')
        .send({ direction: 'sideways' });

      expect(res.status).toBe(400);
      expect(res.body.details[0].msg).toBe("Direction must be 'up' or 'down'");
    });
  });

  describe('GET /api/sessions/today', () => {
    it('returns sessions and a summary -> 200', async () => {
      const res = await request(app).get('/api/sessions/today');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.sessions)).toBe(true);
      expect(res.body.sessions[0]).toHaveProperty('_id', 'mock-session-id');
      expect(res.body.summary).toBeDefined();
      expect(res.body.summary).toHaveProperty('total');
      expect(res.body.summary).toHaveProperty('inProgress');
      expect(res.body.summary).toHaveProperty('notStarted');
      expect(res.body.summary).toHaveProperty('completed');
      expect(res.body.summary).toHaveProperty('withAnomalies');
    });
  });

  describe('role enforcement', () => {
    it('lets a doctor schedule a session', async () => {
      actingRole = 'doctor';
      const res = await request(app).post('/api/sessions').send(validSessionBody());
      expect(res.status).toBe(201);
    });

    it('stops a doctor starting a session -> 403', async () => {
      actingRole = 'doctor';
      const res = await request(app)
        .patch('/api/sessions/mock-session-id')
        .send({ status: 'in_progress' });

      expect(res.status).toBe(403);
      expect(res.body.requiredPermission).toBe('session:start');
    });

    it('stops a doctor completing a session -> 403', async () => {
      actingRole = 'doctor';
      const res = await request(app)
        .patch('/api/sessions/mock-session-id/complete')
        .send({
          postWeight: 72,
          postBloodPressure: { systolic: 130, diastolic: 80 },
          sessionDurationMinutes: 235,
        });

      expect(res.status).toBe(403);
    });

    it('stops a doctor reordering the queue -> 403', async () => {
      actingRole = 'doctor';
      const res = await request(app)
        .patch('/api/sessions/mock-session-id/queue')
        .send({ direction: 'up' });

      expect(res.status).toBe(403);
    });

    it('lets a read-only user view the schedule', async () => {
      actingRole = 'user';
      const res = await request(app).get('/api/sessions/today');
      expect(res.status).toBe(200);
    });

    it('stops a read-only user creating a session -> 403', async () => {
      actingRole = 'user';
      const res = await request(app).post('/api/sessions').send(validSessionBody());
      expect(res.status).toBe(403);
    });

    it('checks permission before validation, so a forbidden caller learns nothing about the body', async () => {
      actingRole = 'user';
      const res = await request(app).post('/api/sessions').send({});

      expect(res.status).toBe(403);
      expect(res.body.details).toBeUndefined();
    });

    it('lets an admin do everything a nurse can', async () => {
      actingRole = 'admin';
      const res = await request(app).post('/api/sessions').send(validSessionBody());
      expect(res.status).toBe(201);
    });
  });
});
