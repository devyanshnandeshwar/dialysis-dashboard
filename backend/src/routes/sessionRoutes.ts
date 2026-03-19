import { Router } from 'express';
import { body } from 'express-validator';
import validate from '../middleware/validate';
import {
  createSession,
  getTodaySessions,
  updateNurseNotes,
  getSessionById,
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
 * GET /api/sessions/today — today's sessions
 * Must be before /:id to avoid "today" being parsed as an ObjectId
 */
router.get('/today', getTodaySessions);

/**
 * GET /api/sessions/:id — single session detail
 */
router.get('/:id', getSessionById);

/**
 * PATCH /api/sessions/:id/notes — update nurse notes
 */
router.patch('/:id/notes', updateNurseNotes);

export default router;
