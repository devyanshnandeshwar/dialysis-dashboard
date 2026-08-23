import request from 'supertest';
import express from 'express';
import requirePermission from '../../middleware/requirePermission';
import errorHandler from '../../middleware/errorHandler';
import { AuthedRequest, TokenPayload } from '../../middleware/auth';
import { ROLES, ROLE_PERMISSIONS, permissionsFor, roleHas } from '../permissions';

function appActingAs(user: Partial<TokenPayload> | null) {
  const app = express();
  app.use((req, _res, next) => {
    if (user) (req as AuthedRequest).user = user as TokenPayload;
    next();
  });
  app.get('/start', requirePermission('session:start'), (_req, res) => res.json({ ok: true }));
  app.use(errorHandler);
  return app;
}

describe('permission table', () => {
  it('gives every role the read permissions', () => {
    for (const role of ROLES) {
      expect(roleHas(role, 'patient:view')).toBe(true);
      expect(roleHas(role, 'session:view')).toBe(true);
      expect(roleHas(role, 'machine:view')).toBe(true);
    }
  });

  it('lets only admin and nurse run a session', () => {
    expect(roleHas('admin', 'session:complete')).toBe(true);
    expect(roleHas('nurse', 'session:complete')).toBe(true);
    expect(roleHas('doctor', 'session:complete')).toBe(false);
    expect(roleHas('user', 'session:complete')).toBe(false);
  });

  it('lets doctors keep the record but not operate the floor', () => {
    expect(roleHas('doctor', 'patient:edit')).toBe(true);
    expect(roleHas('doctor', 'session:create')).toBe(true);
    expect(roleHas('doctor', 'session:notes')).toBe(true);
    expect(roleHas('doctor', 'session:reorder')).toBe(false);
  });

  it('gives a read-only user no write permission at all', () => {
    const writes = ROLE_PERMISSIONS.user.filter((p) => !p.endsWith(':view'));
    expect(writes).toEqual([]);
  });

  it('resolves an unknown role to no permissions rather than a default set', () => {
    expect(permissionsFor('superuser')).toEqual([]);
    expect(permissionsFor(undefined)).toEqual([]);
    expect(roleHas('superuser', 'patient:view')).toBe(false);
  });
});

describe('requirePermission', () => {
  it('allows a role that holds the permission', async () => {
    const res = await request(appActingAs({ role: 'nurse' })).get('/start');
    expect(res.status).toBe(200);
  });

  it('returns 403 with the required permission named', async () => {
    const res = await request(appActingAs({ role: 'doctor' })).get('/start');
    expect(res.status).toBe(403);
    expect(res.body.requiredPermission).toBe('session:start');
    expect(res.body.role).toBe('doctor');
  });

  // 401 vs 403 matters: the client signs out on 401 but not on 403.
  it('fails closed with 401 when no user was attached', async () => {
    const res = await request(appActingAs(null)).get('/start');
    expect(res.status).toBe(401);
  });

  it('denies a role that is not in the table', async () => {
    const res = await request(appActingAs({ role: 'ghost' as never })).get('/start');
    expect(res.status).toBe(403);
  });
});
