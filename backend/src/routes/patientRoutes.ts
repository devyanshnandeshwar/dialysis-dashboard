import { Router } from 'express';
import { body } from 'express-validator';
import validate from '../middleware/validate';
import requirePermission from '../middleware/requirePermission';
import {
  createPatient,
  getPatients,
  getPatientById,
  updatePatient,
} from '../controllers/patientController';

const router = Router();

const genderRule = body('gender')
  .optional({ values: 'falsy' })
  .isIn(['Male', 'Female', 'Other'])
  .withMessage('Gender must be Male, Female, or Other');

const phoneNumberRule = body('phoneNumber')
  .optional({ values: 'falsy' })
  .trim()
  .matches(/^\+?[\d\s()-]{7,20}$/)
  .withMessage('Phone number must be 7-20 digits, optionally with +, spaces, hyphens, or parentheses');

/**
 * POST /api/patients — register a new patient
 * Validates name (required), mrn (required), and dryWeight (> 0).
 */
router.post(
  '/',
  requirePermission('patient:create'),
  validate([
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('mrn').trim().notEmpty().withMessage('MRN is required'),
    body('dryWeight')
      .isFloat({ gt: 0 })
      .withMessage('Dry weight must be greater than 0'),
    body('dateOfBirth')
      .optional({ values: 'falsy' })
      .isISO8601()
      .withMessage('Date of birth must be a valid date'),
    genderRule,
    phoneNumberRule,
  ]),
  createPatient
);

/**
 * GET /api/patients — list all patients
 */
router.get('/', requirePermission('patient:view'), getPatients);

/**
 * GET /api/patients/:id — single patient with last 5 sessions
 */
router.get('/:id', requirePermission('patient:view'), getPatientById);

/**
 * PATCH /api/patients/:id — edit patient details (mrn not editable)
 */
router.patch(
  '/:id',
  requirePermission('patient:edit'),
  validate([
    body('name')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Name cannot be empty'),
    body('dryWeight')
      .optional()
      .isFloat({ gt: 0 })
      .withMessage('Dry weight must be greater than 0'),
    body('dateOfBirth')
      .optional({ values: 'falsy' })
      .isISO8601()
      .withMessage('Date of birth must be a valid date'),
    genderRule,
    phoneNumberRule,
  ]),
  updatePatient
);

export default router;
