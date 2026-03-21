import DialysisSession from '../models/Session';
import Patient from '../models/Patient';
import anomalyConfig from '../config/anomalyConfig';
import detectAnomalies from '../utils/anomalyDetector';
import { getTodayRange } from '../utils/dateUtils';

export class SessionService {
  static async createSession(data: any) {
    const {
      patientId,
      scheduledDate,
      status,
      machineId,
      nurseId,
      preWeight,
      preBloodPressure,
      targetDurationMinutes,
    } = data;

    const scheduled = new Date(scheduledDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + 30);

    if (scheduled < today) {
      throw new Error('Cannot schedule a session in the past');
    }

    if (scheduled > maxDate) {
      throw new Error('Cannot schedule more than 30 days in advance');
    }

    if (!machineId) {
      throw new Error('Machine ID is required');
    }

    const patient = await Patient.findById(patientId);
    if (!patient) {
      throw new Error('Patient not found');
    }

    const { start: startOfDay, end: endOfDay } = getTodayRange(scheduled);

    const duplicate = await DialysisSession.findOne({
      patientId,
      scheduledDate: { $gte: startOfDay, $lt: endOfDay },
    });

    if (duplicate) {
      const error: any = new Error('Patient already has a session scheduled for this date');
      error.existingSessionId = duplicate._id;
      throw error;
    }

    const todayCount = await DialysisSession.countDocuments({
      scheduledDate: { $gte: startOfDay, $lt: endOfDay }
    });

    const existingSession = await DialysisSession.findOne({
      machineId,
      scheduledDate: { $gte: startOfDay, $lte: endOfDay },
      status: { $in: ['not_started', 'in_progress'] },
    });

    if (existingSession) {
      const error: any = new Error('Machine already assigned to another session today');
      error.machineId = machineId;
      throw error;
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

    return await DialysisSession.create(sessionData);
  }

  static async updateSession(id: string, status: string) {
    const session = await DialysisSession.findById(id);

    if (!session) {
      throw new Error('Session not found');
    }

    if (status === 'in_progress' && !session.machineId) {
      throw new Error('Cannot start session — no machine assigned');
    }

    if (status === 'in_progress' && (session.preWeight == null || session.preWeight <= 0)) {
      throw new Error('Cannot start session — pre-session weight is required');
    }

    session.status = status as 'not_started' | 'in_progress' | 'completed';
    await session.save();

    return await DialysisSession.findById(session._id).populate(
      'patientId',
      'name mrn dryWeight'
    );
  }

  static async completeSession(id: string, data: any) {
    const { postWeight, postBloodPressure, sessionDurationMinutes, nurseNotes } = data;

    const session = await DialysisSession.findById(id).populate(
      'patientId',
      'name mrn dryWeight'
    );

    if (!session) {
      throw new Error('Session not found');
    }

    if (!session.machineId) {
      throw new Error('Cannot complete session — no machine assigned');
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

    const { start: startOfDay, end: endOfDay } = getTodayRange(new Date(session.scheduledDate));
    const activeUsingSameMachine = await DialysisSession.countDocuments({
      _id: { $ne: session._id },
      machineId: session.machineId,
      scheduledDate: { $gte: startOfDay, $lt: endOfDay },
      status: { $in: ['not_started', 'in_progress'] },
    });

    if (activeUsingSameMachine > 0) {
      console.warn(
        `[machine-integrity] session ${session._id.toString()} completed but machine ${session.machineId} remains active in ${activeUsingSameMachine} session(s)`
      );
    }

    return await DialysisSession.findById(session._id).populate(
      'patientId',
      'name mrn dryWeight'
    );
  }

  static async getTodaySessions(includeCompleted: boolean = true) {
    const { start: startOfDay, end: endOfDay } = getTodayRange();

    const statusFilter = includeCompleted
      ? undefined
      : { $in: ['in_progress', 'not_started'] as const };

    const sessions = await DialysisSession.find({
      scheduledDate: { $gte: startOfDay, $lt: endOfDay },
      ...(statusFilter ? { status: statusFilter } : {}),
    })
      .populate('patientId', 'name mrn dryWeight')
      .sort({ queuePosition: 1, createdAt: 1 });

    const statusOrder: Record<'in_progress' | 'not_started' | 'completed', number> = {
      in_progress: 0,
      not_started: 1,
      completed: 2,
    };

    const sortedSessions = [...sessions].sort((a, b) => {
      const statusDelta = statusOrder[a.status] - statusOrder[b.status];
      if (statusDelta !== 0) {
        return statusDelta;
      }

      const aQueue = a.queuePosition ?? Number.MAX_SAFE_INTEGER;
      const bQueue = b.queuePosition ?? Number.MAX_SAFE_INTEGER;
      if (aQueue !== bQueue) {
        return aQueue - bQueue;
      }

      return a._id.toString().localeCompare(b._id.toString());
    });

    const summary = {
      total: sortedSessions.length,
      inProgress: sortedSessions.filter((s) => s.status === 'in_progress').length,
      notStarted: sortedSessions.filter((s) => s.status === 'not_started').length,
      completed: sortedSessions.filter((s) => s.status === 'completed').length,
      withAnomalies: sortedSessions.filter((s) => s.anomalies.length > 0).length,
    };

    return {
      sessions: sortedSessions,
      summary,
    };
  }

  static async updateNurseNotes(id: string, nurseNotes: string) {
    const session = await DialysisSession.findByIdAndUpdate(
      id,
      { nurseNotes },
      { new: true, runValidators: true }
    );

    if (!session) {
      throw new Error('Session not found');
    }

    return session;
  }

  static async getSessionById(id: string) {
    const session = await DialysisSession.findById(id).populate(
      'patientId',
      'name mrn dryWeight'
    );

    if (!session) {
      throw new Error('Session not found');
    }

    return session;
  }

  static async reorderQueue(id: string, direction: 'up' | 'down') {
    const session = await DialysisSession.findById(id);
    if (!session) {
      throw new Error('Session not found');
    }

    const { start: startOfDay, end: endOfDay } = getTodayRange();

    const todaySessions = await DialysisSession.find({
      scheduledDate: { $gte: startOfDay, $lte: endOfDay }
    }).sort({ queuePosition: 1 });

    const currentIndex = todaySessions.findIndex(s => s._id.toString() === id);
    if (currentIndex === -1) {
      throw new Error('Session not in today schedule');
    }

    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (swapIndex < 0 || swapIndex >= todaySessions.length) {
      throw new Error('Cannot move further in that direction');
    }

    const currentSession = todaySessions[currentIndex]!;
    const swapSession = todaySessions[swapIndex]!;

    const currentPos = currentSession.queuePosition;
    const swapPos = swapSession.queuePosition;

    await DialysisSession.findByIdAndUpdate(currentSession._id, { queuePosition: swapPos });
    await DialysisSession.findByIdAndUpdate(swapSession._id, { queuePosition: currentPos });

    return await DialysisSession.find({
      scheduledDate: { $gte: startOfDay, $lte: endOfDay }
    })
      .populate('patientId', 'name mrn dryWeight')
      .sort({ queuePosition: 1 });
  }

  static async getPaginatedSessions(queryOptions: { patientId?: string, page?: string, limit?: string }) {
    const { patientId, page = '1', limit = '5' } = queryOptions;

    const query: Record<string, any> = {};
    if (patientId) query.patientId = patientId;

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 5;
    const skip = (pageNum - 1) * limitNum;

    const [sessions, total] = await Promise.all([
      DialysisSession.find(query)
        .sort({ scheduledDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('patientId', 'name mrn dryWeight'),
      DialysisSession.countDocuments(query),
    ]);

    return {
      sessions,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }
}
