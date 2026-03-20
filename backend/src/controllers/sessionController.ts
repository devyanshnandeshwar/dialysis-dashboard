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
export const reorderQueue = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { direction } = req.body; // 'up' or 'down'

    console.log('Reorder request:', id, direction);

    // Get the session to move
    const session = await DialysisSession.findById(id);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    // Get today's date range
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // Get all today's sessions sorted by queuePosition
    const todaySessions = await DialysisSession.find({
      scheduledDate: { $gte: startOfDay, $lte: endOfDay }
    }).sort({ queuePosition: 1 });

    // Find index of current session
    const currentIndex = todaySessions.findIndex(s => s._id.toString() === id);
    if (currentIndex === -1) {
      res.status(404).json({ error: 'Session not in today schedule' });
      return;
    }

    // Determine swap target
    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (swapIndex < 0 || swapIndex >= todaySessions.length) {
      res.status(400).json({ error: 'Cannot move further in that direction' });
      return;
    }

    // Swap queuePositions
    const currentPos = todaySessions[currentIndex].queuePosition;
    const swapPos = todaySessions[swapIndex].queuePosition;

    await DialysisSession.findByIdAndUpdate(todaySessions[currentIndex]._id, { queuePosition: swapPos });
    await DialysisSession.findByIdAndUpdate(todaySessions[swapIndex]._id, { queuePosition: currentPos });

    // Return updated today's schedule
    const updated = await DialysisSession.find({
      scheduledDate: { $gte: startOfDay, $lte: endOfDay }
    })
      .populate('patientId', 'name mrn dryWeight')
      .sort({ queuePosition: 1 });

    res.json(updated);
  } catch (err) {
    next(err);
  }
};
