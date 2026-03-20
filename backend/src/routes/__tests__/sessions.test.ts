import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import sessionRoutes from '../sessionRoutes';
import DialysisSession from '../../models/Session';
import Patient from '../../models/Patient';

const app = express();
app.use(express.json());
app.use('/api/sessions', sessionRoutes);

// Mock the anomaly detector to prevent complex logic during route tests
jest.mock('../../utils/anomalyDetector', () => ({
  __esModule: true,
  default: jest.fn(() => [{ type: 'mock_anomaly', severity: 'warning', message: 'test' }])
}));

describe('Session API Routes', () => {
  let patientId: string;

  beforeAll(async () => {
    // Setup in-memory db or rely on proper mocks/test DB.
    // For simplicity, we mock mongoose methods since we don't have mongodb-memory-server loaded.
    jest.spyOn(Patient, 'findById').mockResolvedValue({ 
      _id: 'mock-patient-id', 
      dryWeight: 70 
    } as any);

    jest.spyOn(DialysisSession, 'countDocuments').mockResolvedValue(0);
    
    jest.spyOn(DialysisSession, 'create').mockImplementation((data: any) => Promise.resolve({
      _id: 'mock-session-id',
      ...data
    }) as any);

    jest.spyOn(DialysisSession, 'find').mockReturnValue({
      populate: jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue([
          { _id: 'mock-session-id', queuePosition: 1 }
        ])
      })
    } as any);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('POST /api/sessions with valid body -> 201 with anomalies array', async () => {
    const res = await request(app)
      .post('/api/sessions')
      .send({
        patientId: 'mock-patient-id',
        scheduledDate: new Date().toISOString(),
        status: 'in_progress',
        preWeight: 75
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('_id', 'mock-session-id');
    expect(res.body.anomalies).toHaveLength(1);
    expect(res.body.anomalies[0].type).toBe('mock_anomaly');
  });

  it('POST /api/sessions missing patientId -> 400', async () => {
    const res = await request(app)
      .post('/api/sessions')
      .send({
        scheduledDate: new Date().toISOString(),
      });

    expect(res.status).toBe(400);
    expect(res.body.details).toBeDefined();
    expect(res.body.details[0].msg).toBe('Patient ID is required');
  });

  it('GET /api/sessions/today -> 200 returns array', async () => {
    const res = await request(app).get('/api/sessions/today');
    
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toHaveProperty('_id', 'mock-session-id');
  });
});
