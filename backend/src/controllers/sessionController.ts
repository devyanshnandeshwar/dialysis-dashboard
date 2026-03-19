import { Request, Response, NextFunction } from 'express';
import DialysisSession from '../models/Session';
import Patient from '../models/Patient';
import anomalyConfig from '../config/anomalyConfig';
import detectAnomalies from '../utils/anomalyDetector';

/**
 * POST /api/sessions — record a new dialysis session.
 * Runs anomaly detection before saving.
 */
export const createSession = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      patientId,
      scheduledDate,
      status,
      machineId,
      nurseId,
      preWeight,
      postWeight,
      preBloodPressure,
      postBloodPressure,
      sessionDurationMinutes,
      targetDurationMinutes,
      nurseNotes,
    } = req.body;

    // Fetch the patient for dry weight (needed by anomaly detector)
    const patient = await Patient.findById(patientId);
    if (!patient) {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }

    const sessionData = {
      patientId,
      scheduledDate,
      status,
      machineId,
      nurseId,
      preWeight,
      postWeight,
      preBloodPressure,
      postBloodPressure,
      sessionDurationMinutes,
      targetDurationMinutes: targetDurationMinutes ?? 240,
      nurseNotes,
    };

    // Run anomaly detection
    const anomalies = detectAnomalies(sessionData, patient, anomalyConfig);

    const session = await DialysisSession.create({
      ...sessionData,
      anomalies,
    });

    res.status(201).json(session);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/sessions/today — all sessions scheduled for today.
 * Populates patient name, mrn, dryWeight.
 * Sorts: in_progress → not_started → completed.
 */
export const getTodaySessions = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    const sessions = await DialysisSession.find({
      scheduledDate: { $gte: startOfDay, $lt: endOfDay },
    }).populate('patientId', 'name mrn dryWeight');

    // Custom sort: in_progress first, then not_started, then completed
    const statusOrder: Record<string, number> = {
      in_progress: 0,
      not_started: 1,
      completed: 2,
    };

    sessions.sort(
      (a, b) => (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3)
    );

    res.json(sessions);
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/sessions/:id/notes — update nurse notes only.
 */
export const updateNurseNotes = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const session = await DialysisSession.findByIdAndUpdate(
      req.params.id,
      { nurseNotes: req.body.nurseNotes },
      { new: true, runValidators: true }
    );

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    res.json(session);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/sessions/:id — single session detail.
 */
export const getSessionById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const session = await DialysisSession.findById(req.params.id).populate(
      'patientId',
      'name mrn dryWeight'
    );

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    res.json(session);
  } catch (err) {
    next(err);
  }
};
