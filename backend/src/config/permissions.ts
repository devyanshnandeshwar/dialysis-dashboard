/**
 * Roles and what each one may do.
 *
 * This file is the single source of truth. The backend enforces it via
 * `requirePermission`, and the frontend receives the resolved permission list
 * for the signed-in user from `/api/auth/me` rather than duplicating the table
 * — so the UI can never drift from what the API actually allows.
 *
 * To change what a role can do, edit ROLE_PERMISSIONS and nothing else.
 */

export const ROLES = ['admin', 'doctor', 'nurse', 'user'] as const;
export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  'patient:view',
  'patient:create',
  'patient:edit',
  'session:view',
  'session:create',
  'session:start',
  'session:complete',
  'session:notes',
  'session:reorder',
  'machine:view',
] as const;
export type Permission = (typeof PERMISSIONS)[number];

/** Read-only observer: sees the ward, changes nothing. */
const VIEW_ONLY: Permission[] = ['patient:view', 'session:view', 'machine:view'];

/**
 * Clinical oversight and record-keeping: may register patients, schedule
 * treatment and annotate the record, but does not operate the floor.
 */
const CLINICAL_RECORD: Permission[] = [
  ...VIEW_ONLY,
  'patient:create',
  'patient:edit',
  'session:create',
  'session:notes',
];

/**
 * Floor operations: everything above, plus running the machine — moving a
 * session through its lifecycle and ordering the physical queue.
 */
const FLOOR_OPS: Permission[] = [
  ...CLINICAL_RECORD,
  'session:start',
  'session:complete',
  'session:reorder',
];

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  admin: PERMISSIONS,
  nurse: FLOOR_OPS,
  doctor: CLINICAL_RECORD,
  user: VIEW_ONLY,
};

export const isRole = (value: unknown): value is Role =>
  typeof value === 'string' && (ROLES as readonly string[]).includes(value);

/**
 * Permissions for a role name that may have come from a token signed before the
 * table changed. An unrecognised role resolves to nothing rather than to a
 * default set, so a stale token can only ever lose access, never gain it.
 */
export const permissionsFor = (role: unknown): Permission[] =>
  isRole(role) ? [...ROLE_PERMISSIONS[role]] : [];

export const roleHas = (role: unknown, permission: Permission): boolean =>
  isRole(role) && ROLE_PERMISSIONS[role].includes(permission);
