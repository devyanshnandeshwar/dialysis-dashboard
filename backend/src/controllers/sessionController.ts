import { Request, Response, NextFunction } from 'express';
import DialysisSession from '../models/Session';
import Patient from '../models/Patient';
import anomalyConfig from '../config/anomalyConfig';
import detectAnomalies from '../utils/anomalyDetector';
import { getTodayRange } from '../utils/dateUtils';

/**
 * POST /api/sessions — record a new dialysis session.
 * Captures start-of-session data only.
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
      preBloodPressure,
      targetDurationMinutes,
    } = req.body;

    if (!machineId) {
      res.status(400).json({ error: 'Machine ID is required' });
      return;
    }

    // Fetch the patient for dry weight (needed by anomaly detector)
    const patient = await Patient.findById(patientId);
    if (!patient) {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }

    // Auto-assign queuePosition (count of today's sessions + 1)
    const { start: startOfDay, end: endOfDay } = getTodayRange(new Date(scheduledDate));

    const todayCount = await DialysisSession.countDocuments({
      scheduledDate: { $gte: startOfDay, $lt: endOfDay }
    });

    const existingSession = await DialysisSession.findOne({
      machineId,
      scheduledDate: { $gte: startOfDay, $lte: endOfDay },
      status: { $in: ['not_started', 'in_progress'] },
    });

    if (existingSession) {
      res.status(409).json({
        error: 'Machine already assigned to another session today',
        machineId,
      });
      return;
    }

    const sessionData = {
      patientId,
      scheduledDate,
      status,
      machineId,
      nurseId,
      preWeight,
      preBloodPressure,
      postWeight: null,
      postBloodPressure: null,
      sessionDurationMinutes: null,
      targetDurationMinutes: targetDurationMinutes ?? 240,
      nurseNotes: null,
      queuePosition: todayCount + 1,
      anomalies: [],
    };

    const session = await DialysisSession.create(sessionData);

    res.status(201).json(session);
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/sessions/:id — update session status (used to start session).
 */
export const updateSession = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const session = await DialysisSession.findById(req.params.id);

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    if (req.body.status === 'in_progress' && !session.machineId) {
      res.status(400).json({
        error: 'Cannot start session — no machine assigned',
      });
      return;
    }

    session.status = req.body.status;
    await session.save();

    const populated = await DialysisSession.findById(session._id).populate(
      'patientId',
      'name mrn dryWeight'
    );

    res.json(populated);
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/sessions/:id/complete — complete session and detect anomalies.
 */
export const completeSession = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { postWeight, postBloodPressure, sessionDurationMinutes, nurseNotes } = req.body;

    const session = await DialysisSession.findById(req.params.id).populate(
      'patientId',
      'name mrn dryWeight'
    );

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    if (!session.machineId) {
      res.status(400).json({
        error: 'Cannot complete session — no machine assigned',
      });
      return;
    }

    const patient = session.patientId as unknown as { dryWeight: number };

    session.postWeight = postWeight;
    session.postBloodPressure = postBloodPressure;
    session.sessionDurationMinutes = sessionDurationMinutes;
    session.nurseNotes = nurseNotes ?? session.nurseNotes ?? null;
    session.status = 'completed';

    const anomalies = detectAnomalies(
      {
        ...(session.preWeight != null ? { preWeight: session.preWeight } : {}),
        postWeight,
        postBloodPressure,
        sessionDurationMinutes,
        targetDurationMinutes: session.targetDurationMinutes,
      },
      { dryWeight: patient.dryWeight },
      anomalyConfig
    );

    session.anomalies = anomalies;
    await session.save();

    const populated = await DialysisSession.findById(session._id).populate(
      'patientId',
      'name mrn dryWeight'
    );

    res.json(populated);
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
    const { start: startOfDay, end: endOfDay } = getTodayRange();

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

    // Get the session to move
    const session = await DialysisSession.findById(id);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    // Get today's date range
    const { start: startOfDay, end: endOfDay } = getTodayRange();

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
    const currentSession = todaySessions[currentIndex]!;
    const swapSession = todaySessions[swapIndex]!;

    const currentPos = currentSession.queuePosition;
    const swapPos = swapSession.queuePosition;

    await DialysisSession.findByIdAndUpdate(currentSession._id, { queuePosition: swapPos });
    await DialysisSession.findByIdAndUpdate(swapSession._id, { queuePosition: currentPos });

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

/**
 * GET /api/sessions — list sessions with pagination
 * Query: patientId (optional), page (default 1), limit (default 5)
 */
export const getPaginatedSessions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { patientId, page = '1', limit = '5' } = req.query;

    const query: Record<string, any> = {};
    if (patientId) query.patientId = patientId;

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 5;
    const skip = (pageNum - 1) * limitNum;

    const [sessions, total] = await Promise.all([
      DialysisSession.find(query)
        .sort({ scheduledDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('patientId', 'name mrn dryWeight'),
      DialysisSession.countDocuments(query),
    ]);

    res.json({
      sessions,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    next(err);
  }
};
