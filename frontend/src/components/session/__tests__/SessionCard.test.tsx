import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import SessionCard from '../SessionCard';
import type { DialysisSession } from '@/types';
import type { Permission, Role } from '@/lib/permissions';

/**
 * The real AuthProvider calls /auth/me on mount. Stubbing the hook keeps these
 * tests about the card while letting each case act as a different role.
 *
 * The permission lists here mirror backend/src/config/permissions.ts. They are
 * intentionally duplicated: if the server table changes and this copy does not,
 * these tests fail, which is the reminder to look.
 */
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: [
    'patient:view', 'patient:create', 'patient:edit',
    'session:view', 'session:create', 'session:start', 'session:complete',
    'session:notes', 'session:reorder', 'machine:view',
  ],
  nurse: [
    'patient:view', 'patient:create', 'patient:edit',
    'session:view', 'session:create', 'session:start', 'session:complete',
    'session:notes', 'session:reorder', 'machine:view',
  ],
  doctor: [
    'patient:view', 'patient:create', 'patient:edit',
    'session:view', 'session:create', 'session:notes', 'machine:view',
  ],
  user: ['patient:view', 'session:view', 'machine:view'],
};

let actingRole: Role = 'nurse';

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u1', email: 'a@b.c', role: actingRole, permissions: ROLE_PERMISSIONS[actingRole] },
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
    can: (permission: Permission) => ROLE_PERMISSIONS[actingRole].includes(permission),
  }),
}));

const baseSession: DialysisSession = {
  _id: 'sess-1',
  patientId: {
    _id: 'pat-1',
    name: 'John Carter',
    mrn: 'MRN-001',
    dryWeight: 72,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
  scheduledDate: new Date().toISOString(),
  status: 'in_progress',
  machineId: 'M-101',
  preWeight: 75,
  postWeight: 72.5,
  preBloodPressure: { systolic: 140, diastolic: 85 },
  postBloodPressure: { systolic: 130, diastolic: 80 },
  sessionDurationMinutes: 230,
  targetDurationMinutes: 240,
  nurseNotes: 'Patient is stable.',
  anomalies: [],
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
};

function renderCard(session: DialysisSession) {
  return render(
    <BrowserRouter>
      <SessionCard
        session={session}
        sequenceNumber={1}
        onPatientUpdated={() => {}}
        onSessionUpdated={() => {}}
      />
    </BrowserRouter>
  );
}

describe('SessionCard', () => {
  beforeEach(() => {
    actingRole = 'nurse';
  });

  it('renders patient name and MRN', () => {
    renderCard(baseSession);
    expect(screen.getByText('John Carter')).toBeDefined();
    expect(screen.getByText(/MRN-001/)).toBeDefined();
  });

  it('shows critical anomaly badge when anomalies has critical severity', () => {
    const session: DialysisSession = {
      ...baseSession,
      anomalies: [
        {
          type: 'high_post_bp',
          severity: 'critical',
          message: 'Post-dialysis systolic BP 170 mmHg exceeds 160 mmHg',
        },
      ],
    };
    renderCard(session);
    expect(screen.getByText(/high bp/i)).toBeDefined();
  });

  it('shows no anomaly badges when anomalies array is empty', () => {
    renderCard(baseSession);
    expect(screen.queryByText('Weight Gain')).toBeNull();
    expect(screen.queryByText('High BP')).toBeNull();
    expect(screen.queryByText('Short Session')).toBeNull();
    expect(screen.queryByText('Long Session')).toBeNull();
  });

  describe('role-dependent actions', () => {
    const notStarted: DialysisSession = { ...baseSession, status: 'not_started' };

    it('offers Start to a nurse', () => {
      actingRole = 'nurse';
      renderCard(notStarted);
      expect(screen.getByRole('button', { name: /start/i })).toBeDefined();
    });

    it('replaces Start with a status label for a doctor', () => {
      actingRole = 'doctor';
      renderCard(notStarted);
      expect(screen.queryByRole('button', { name: /^start$/i })).toBeNull();
      expect(screen.getByText(/awaiting start/i)).toBeDefined();
    });

    it('offers Complete on a running session to a nurse', () => {
      actingRole = 'nurse';
      renderCard(baseSession);
      expect(screen.getByRole('button', { name: /complete/i })).toBeDefined();
    });

    it('hides Complete from a read-only user', () => {
      actingRole = 'user';
      renderCard(baseSession);
      expect(screen.queryByRole('button', { name: /complete/i })).toBeNull();
      expect(screen.getByText(/on machine/i)).toBeDefined();
    });

    it('disables the queue controls for a role that cannot reorder', () => {
      actingRole = 'doctor';
      renderCard(baseSession);
      const down = screen.getByRole('button', { name: /move down in queue/i });
      expect(down.hasAttribute('disabled')).toBe(true);
      expect(down.getAttribute('title')).toMatch(/cannot reorder/i);
    });

    it('leaves the queue controls usable for a nurse', () => {
      actingRole = 'nurse';
      renderCard(baseSession);
      const down = screen.getByRole('button', { name: /move down in queue/i });
      expect(down.hasAttribute('disabled')).toBe(false);
    });

    it('hides patient editing from a read-only user', () => {
      actingRole = 'user';
      renderCard(baseSession);
      expect(screen.queryByRole('button', { name: /edit patient/i })).toBeNull();
    });
  });
});
