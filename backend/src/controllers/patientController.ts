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
    const patients = await Patient.find().sort({ createdAt: -1 }).lean();
    
    // Get session stats per patient
    const stats = await DialysisSession.aggregate([
      { $sort: { scheduledDate: -1, createdAt: -1 } },
      {
        $group: {
          _id: '$patientId',
          totalSessions: { $sum: 1 },
          lastSessionDetails: { $first: '$$ROOT' },
        },
      },
    ]);

    const statsMap = new Map(stats.map(s => [s._id.toString(), s]));

    const enrichedPatients = patients.map(p => {
      const pStats = statsMap.get(p._id.toString());
      return {
        ...p,
        totalSessions: pStats?.totalSessions || 0,
        lastSession: pStats ? {
          date: pStats.lastSessionDetails.scheduledDate,
          status: pStats.lastSessionDetails.status,
        } : null,
        lastAnomalies: pStats?.lastSessionDetails.anomalies || [],
      };
    });

    res.json(enrichedPatients);
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

/**
 * PATCH /api/patients/:id — update patient details.
 * MRN is NOT editable.
 */
export const updatePatient = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, dryWeight, dateOfBirth, primaryDiagnosis, assignedUnit } =
      req.body;

    if (dryWeight !== undefined && (typeof dryWeight !== 'number' || dryWeight <= 0)) {
      res.status(400).json({ error: 'dryWeight must be greater than 0' });
      return;
    }

    const update: Record<string, unknown> = {};
    if (name !== undefined) update.name = name;
    if (dryWeight !== undefined) update.dryWeight = dryWeight;
    if (dateOfBirth !== undefined) update.dateOfBirth = dateOfBirth;
    if (primaryDiagnosis !== undefined) update.primaryDiagnosis = primaryDiagnosis;
    if (assignedUnit !== undefined) update.assignedUnit = assignedUnit;

    const patient = await Patient.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true, runValidators: true }
    );

    if (!patient) {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }

    res.json(patient);
  } catch (err) {
    next(err);
  }
};
