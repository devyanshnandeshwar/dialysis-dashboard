import { Router } from 'express';
import { body } from 'express-validator';
import validate from '../middleware/validate';
import {
  createSession,
  getTodaySessions,
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
    body('scheduledDate')
      .isISO8601()
      .withMessage('Scheduled date must be a valid date'),
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
