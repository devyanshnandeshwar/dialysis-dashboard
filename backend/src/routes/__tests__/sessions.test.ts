import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../index';
import Patient from '../../models/Patient';
import DialysisSession from '../../models/Session';

let patientId: string;

beforeAll(async () => {
  const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/dialysis_test';
  await mongoose.connect(mongoURI);

  // Create a test patient
  const patient = await Patient.create({
    name: 'Test Patient',
    mrn: 'TEST-001',
    dryWeight: 70,
  });
  patientId = patient._id.toString();
});

afterAll(async () => {
  await DialysisSession.deleteMany({ patientId });
  await Patient.deleteMany({ mrn: 'TEST-001' });
  await mongoose.disconnect();
});

describe('Session API', () => {
  it('POST /api/sessions with valid data returns 201 with anomalies', async () => {
    const res = await request(app)
      .post('/api/sessions')
      .send({
        patientId,
        scheduledDate: new Date().toISOString(),
        status: 'in_progress',
        preWeight: 73, // gain 3kg → critical
        postBloodPressure: { systolic: 165, diastolic: 90 },
        targetDurationMinutes: 240,
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('_id');
    expect(res.body).toHaveProperty('anomalies');
    expect(res.body.anomalies.length).toBeGreaterThan(0);
  });

  it('POST /api/sessions missing patientId returns 400', async () => {
    const res = await request(app)
      .post('/api/sessions')
      .send({
        scheduledDate: new Date().toISOString(),
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('GET /api/sessions/today returns an array', async () => {
    const res = await request(app).get('/api/sessions/today');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
