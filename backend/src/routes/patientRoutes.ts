import { Router } from 'express';
import { body } from 'express-validator';
import validate from '../middleware/validate';
import {
  createPatient,
  getPatients,
  getPatientById,
  updatePatient,
} from '../controllers/patientController';

const router = Router();

/**
 * POST /api/patients — register a new patient
 * Validates name (required), mrn (required), and dryWeight (> 0).
 */
router.post(
  '/',
  validate([
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('mrn').trim().notEmpty().withMessage('MRN is required'),
    body('dryWeight')
      .isFloat({ gt: 0 })
      .withMessage('Dry weight must be greater than 0'),
  ]),
  createPatient
);

/**
 * GET /api/patients — list all patients
 */
router.get('/', getPatients);

/**
 * GET /api/patients/:id — single patient with last 5 sessions
 */
router.get('/:id', getPatientById);

/**
 * PATCH /api/patients/:id — edit patient details (mrn not editable)
 */
router.patch('/:id', updatePatient);

export default router;
