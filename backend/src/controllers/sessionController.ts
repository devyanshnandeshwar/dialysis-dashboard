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

    // Auto-assign queuePosition (count of today's sessions + 1)
    const now = new Date(scheduledDate);
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
    
    const todayCount = await DialysisSession.countDocuments({
      scheduledDate: { $gte: startOfDay, $lt: endOfDay }
    });

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
      queuePosition: todayCount + 1,
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
    })
      .populate('patientId', 'name mrn dryWeight')
      .sort({ queuePosition: 1, createdAt: 1 });

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

/**
 * PATCH /api/sessions/:id/queue — manual reorder using swap.
 * Body: { direction: 'up' | 'down' }
 * Returns the full updated schedule.
 */
export const updateQueuePosition = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { direction } = req.body;

    if (direction !== 'up' && direction !== 'down') {
      res.status(400).json({ error: 'direction must be "up" or "down"' });
      return;
    }

    const session = await DialysisSession.findById(req.params.id);
    if (!session || !session.queuePosition) {
      res.status(404).json({ error: 'Session not found or has no queuePosition' });
      return;
    }

    // Get today's date range to only swap within same day
    const sessionDate = new Date(session.scheduledDate);
    const startOfDay = new Date(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    const currentPos = session.queuePosition;
    const targetPos = direction === 'up' ? currentPos - 1 : currentPos + 1;

    // Find the session currently at the target position
    const adjacentSession = await DialysisSession.findOne({
      scheduledDate: { $gte: startOfDay, $lt: endOfDay },
      queuePosition: targetPos,
    });

    if (adjacentSession) {
      // Swap positions
      adjacentSession.queuePosition = currentPos;
      session.queuePosition = targetPos;
      
      await Promise.all([
        adjacentSession.save(),
        session.save()
      ]);
    }

    // Return full sorted schedule
    const sessions = await DialysisSession.find({
      scheduledDate: { $gte: startOfDay, $lt: endOfDay },
    })
      .populate('patientId', 'name mrn dryWeight')
      .sort({ queuePosition: 1, createdAt: 1 });

    res.json(sessions);
  } catch (err) {
    next(err);
  }
};
