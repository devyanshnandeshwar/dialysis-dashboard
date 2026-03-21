import { Request, Response, NextFunction } from 'express';
import { PatientService } from '../services/patientService';

export const createPatient = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const patient = await PatientService.createPatient(req.body);
    res.status(201).json(patient);
  } catch (err: any) {
    if (err.message === 'MRN already exists') {
      res.status(409).json({ success: false, error: err.message });
      return;
    }
    next(err);
  }
};

export const getPatients = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const enrichedPatients = await PatientService.getPatients();
    res.json(enrichedPatients);
  } catch (err) {
    next(err);
  }
};

export const getPatientById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const patientData = await PatientService.getPatientById(req.params.id as string);
    res.json(patientData);
  } catch (err: any) {
    if (err.message === 'Patient not found') {
      res.status(404).json({ error: err.message });
      return;
    }
    next(err);
  }
};

export const updatePatient = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const patient = await PatientService.updatePatient(req.params.id as string, req.body);
    res.json(patient);
  } catch (err: any) {
    if (err.message === 'Patient not found') {
      res.status(404).json({ error: err.message });
      return;
    }
    if (err.message === 'dryWeight must be greater than 0') {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
};
