import { Router } from 'express';
import { body } from 'express-validator';
import validate from '../middleware/validate';
import {
  createSession,
  completeSession,
  getTodaySessions,
  updateSession,
  updateNurseNotes,
  getSessionById,
  reorderQueue,
  getPaginatedSessions,
} from '../controllers/sessionController';

const router = Router();

/**
 * POST /api/sessions — record a new session
 */
router.post(
  '/',
  validate([
    body('patientId').notEmpty().withMessage('Patient ID is required'),
    body('machineId').notEmpty().withMessage('Machine ID is required'),
    body('scheduledDate')
      .isISO8601()
      .withMessage('Scheduled date must be a valid date'),
    body('targetDurationMinutes')
      .isInt({ min: 1 })
      .withMessage('Target duration must be greater than 0'),
    body('preWeight')
      .isFloat({ gt: 0 })
      .withMessage('Pre-session weight must be greater than 0'),
    body('preBloodPressure.systolic')
      .isFloat({ gt: 0 })
      .withMessage('Pre-session systolic BP must be greater than 0'),
    body('preBloodPressure.diastolic')
      .isFloat({ gt: 0 })
      .withMessage('Pre-session diastolic BP must be greater than 0'),
    body('status')
      .isIn(['not_started', 'in_progress'])
      .withMessage('Status must be not_started or in_progress'),
  ]),
  createSession
);

/**
 * GET /api/sessions — list sessions with optional pagination/filtering
 */
router.get('/', getPaginatedSessions);

/**
 * GET /api/sessions/today — today's sessions
 * Must be before /:id to avoid "today" being parsed as an ObjectId
 */
router.get('/today', getTodaySessions);

/**
 * PATCH /api/sessions/:id — update session status (start session)
 */
router.patch(
  '/:id',
  validate([
    body('status')
      .isIn(['in_progress'])
      .withMessage('Status can only be set to in_progress via this endpoint'),
  ]),
  updateSession
);

/**
 * PATCH /api/sessions/:id/complete — complete session and detect anomalies
 */
router.patch(
  '/:id/complete',
  validate([
    body('postWeight')
      .isFloat({ gt: 0 })
      .withMessage('Post-session weight must be greater than 0'),
    body('postBloodPressure.systolic')
      .isFloat({ gt: 0 })
      .withMessage('Post-session systolic BP must be greater than 0'),
    body('postBloodPressure.diastolic')
      .isFloat({ gt: 0 })
      .withMessage('Post-session diastolic BP must be greater than 0'),
    body('sessionDurationMinutes')
      .isFloat({ gt: 0 })
      .withMessage('Actual session duration must be greater than 0'),
    body('nurseNotes')
      .optional({ nullable: true })
      .isString()
      .withMessage('Nurse notes must be a string'),
  ]),
  completeSession
);

/**
 * PATCH /api/sessions/:id/notes — update nurse notes
 */
router.patch('/:id/notes', updateNurseNotes);

/**
 * PATCH /api/sessions/:id/queue — update queue position
 */
router.patch('/:id/queue', reorderQueue);

/**
 * GET /api/sessions/:id — single session detail
 */
router.get('/:id', getSessionById);

export default router;
