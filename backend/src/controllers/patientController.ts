import { Request, Response, NextFunction } from 'express';
import Patient from '../models/Patient';
import DialysisSession from '../models/Session';

/**
 * POST /api/patients — register a new patient
 */
export const createPatient = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, mrn, dryWeight, dateOfBirth, primaryDiagnosis, assignedUnit } =
      req.body;

    const patient = await Patient.create({
      name,
      mrn,
      dryWeight,
      dateOfBirth,
      primaryDiagnosis,
      assignedUnit,
    });

    res.status(201).json(patient);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/patients — list all patients
 */
export const getPatients = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const patients = await Patient.find().sort({ createdAt: -1 });
    res.json(patients);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/patients/:id — single patient + their last 5 sessions
 */
export const getPatientById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const patient = await Patient.findById(req.params.id);

    if (!patient) {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }

    const recentSessions = await DialysisSession.find({
      patientId: patient._id,
    })
      .sort({ scheduledDate: -1 })
      .limit(5);

    res.json({ ...patient.toObject(), recentSessions });
  } catch (err) {
    next(err);
  }
};
