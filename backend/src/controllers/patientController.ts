import { Request, Response, NextFunction } from 'express';
import Patient from '../models/Patient';
import DialysisSession from '../models/Session';
import { getTodayRange } from '../utils/dateUtils';

/**
 * POST /api/patients — register a new patient
 */
export const createPatient = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, mrn, dryWeight, dateOfBirth, primaryDiagnosis } =
      req.body;

    const normalizedMrn = String(mrn || '')
      .trim()
      .replace(/^MRN[-_\s]*/i, '')
      .toUpperCase();

    const existingPatient = await Patient.findOne({ mrn: normalizedMrn });
    if (existingPatient) {
      res.status(409).json({ success: false, error: 'MRN already exists' });
      return;
    }

    const patient = await Patient.create({
      name,
      mrn: normalizedMrn,
      dryWeight,
      dateOfBirth,
      primaryDiagnosis,
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

    const { start: startOfDay, end: endOfDay } = getTodayRange();

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

    const todaySessions = await DialysisSession.find(
      {
        scheduledDate: { $gte: startOfDay, $lt: endOfDay },
      },
      {
        patientId: 1,
        status: 1,
        machineId: 1,
      }
    )
      .sort({ createdAt: -1 })
      .lean();

    const todaySessionMap = new Map<string, { sessionId: string; status: string; machineId: string | null }>();
    for (const session of todaySessions) {
      const key = session.patientId.toString();
      if (!todaySessionMap.has(key)) {
        todaySessionMap.set(key, {
          sessionId: session._id.toString(),
          status: session.status,
          machineId: session.machineId || null,
        });
      }
    }

    const enrichedPatients = patients.map(p => {
      const pStats = statsMap.get(p._id.toString());
      const todaySession = todaySessionMap.get(p._id.toString()) || null;
      return {
        ...p,
        totalSessions: pStats?.totalSessions || 0,
        lastSession: pStats ? {
          date: pStats.lastSessionDetails.scheduledDate,
          status: pStats.lastSessionDetails.status,
        } : null,
        lastAnomalies: pStats?.lastSessionDetails.anomalies || [],
        todaySession,
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
    delete req.body.mrn;

    const { name, dryWeight, dateOfBirth, primaryDiagnosis } =
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
