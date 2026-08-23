import request from 'supertest';
import express from 'express';
import requireAuth, { signToken } from '../auth';
import errorHandler from '../errorHandler';

const ORIGINAL_SECRET = process.env.JWT_SECRET;
const TEST_SECRET = 'a'.repeat(48);

function buildApp() {
  const app = express();
  app.use(express.json());
  app.get('/protected', requireAuth, (_req, res) => res.json({ ok: true }));
  app.use(errorHandler);
  return app;
}

describe('requireAuth', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = TEST_SECRET;
  });

  afterAll(() => {
    process.env.JWT_SECRET = ORIGINAL_SECRET;
  });

  it('rejects a request with no Authorization header', async () => {
    const res = await request(buildApp()).get('/protected');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Authentication required');
  });

  it('rejects a non-bearer Authorization header', async () => {
    const res = await request(buildApp())
      .get('/protected')
      .set('Authorization', 'Basic dXNlcjpwYXNz');
    expect(res.status).toBe(401);
  });

  it('rejects a garbage token', async () => {
    const res = await request(buildApp())
      .get('/protected')
      .set('Authorization', 'Bearer not.a.jwt');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid or expired token');
  });

  it('rejects a token signed with a different secret', async () => {
    process.env.JWT_SECRET = 'b'.repeat(48);
    const foreign = signToken({ id: '1', email: 'a@b.c', name: 'Test', role: 'nurse' });
    process.env.JWT_SECRET = TEST_SECRET;

    const res = await request(buildApp())
      .get('/protected')
      .set('Authorization', `Bearer ${foreign}`);
    expect(res.status).toBe(401);
  });

  it('accepts a validly signed token and attaches the user', async () => {
    const token = signToken({ id: 'u1', email: 'nurse@example.com', name: 'Test Nurse', role: 'nurse' });
    const res = await request(buildApp())
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('refuses to sign when JWT_SECRET is too short', () => {
    process.env.JWT_SECRET = 'short';
    expect(() => signToken({ id: '1', email: 'a@b.c', name: 'Test', role: 'nurse' })).toThrow(
      /at least 32 characters/
    );
    process.env.JWT_SECRET = TEST_SECRET;
  });
});
