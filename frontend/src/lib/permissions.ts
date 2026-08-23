/**
 * Permission names, mirrored from backend/src/config/permissions.ts.
 *
 * Only the NAMES live here — the role-to-permission table stays on the server
 * and reaches the client as a resolved list on the signed-in user. That keeps
 * the UI from being able to disagree with what the API will actually allow.
 */
export type Permission =
  | 'patient:view'
  | 'patient:create'
  | 'patient:edit'
  | 'session:view'
  | 'session:create'
  | 'session:start'
  | 'session:complete'
  | 'session:notes'
  | 'session:reorder'
  | 'machine:view';

export type Role = 'admin' | 'doctor' | 'nurse' | 'user';

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrator',
  doctor: 'Doctor',
  nurse: 'Nurse',
  user: 'Viewer',
};

/** One line per role, shown under the account in the sidebar. */
export const ROLE_BLURBS: Record<Role, string> = {
  admin: 'Full access',
  doctor: 'Records and scheduling',
  nurse: 'Floor operations',
  user: 'Read only',
};
