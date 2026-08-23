import DialysisSession from '../models/Session';
import Patient from '../models/Patient';
import anomalyConfig from '../config/anomalyConfig';
import detectAnomalies from '../utils/anomalyDetector';
import { getDayRange, getDayKey } from '../utils/dateUtils';
import { badRequest, notFound, conflict } from '../utils/errors';
import { withTransaction } from '../utils/transaction';

const isDuplicateKeyError = (err: unknown): boolean =>
  typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000;

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

    if (Number.isNaN(scheduled.getTime())) {
      throw badRequest('Scheduled date must be a valid date');
    }

    if (scheduled < today) {
      throw badRequest('Cannot schedule a session in the past');
    }

    if (scheduled > maxDate) {
      throw badRequest('Cannot schedule more than 30 days in advance');
    }

    if (!machineId) {
      throw badRequest('Machine ID is required');
    }

    const patient = await Patient.findById(patientId);
    if (!patient) {
      throw notFound('Patient not found');
    }

    const { start: startOfDay, end: endOfDay } = getDayRange(scheduled);

    const duplicate = await DialysisSession.findOne({
      patientId,
      scheduledDate: { $gte: startOfDay, $lt: endOfDay },
    });

    if (duplicate) {
      throw conflict('Patient already has a session scheduled for this date', {
        existingSessionId: duplicate._id,
      });
    }

    const todayCount = await DialysisSession.countDocuments({
      scheduledDate: { $gte: startOfDay, $lt: endOfDay }
    });

    const existingSession = await DialysisSession.findOne({
      machineId,
      scheduledDate: { $gte: startOfDay, $lt: endOfDay },
      status: { $in: ['not_started', 'in_progress'] },
    });

    if (existingSession) {
      throw conflict('Machine already assigned to another session today', { machineId });
    }

    const sessionData = {
      patientId,
      scheduledDate,
      scheduledDay: getDayKey(scheduled),
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

    try {
      return await DialysisSession.create(sessionData);
    } catch (err) {
      // The checks above are read-then-write, so two concurrent requests can
      // both reach this point. The unique (patientId, scheduledDay) index is
      // what actually prevents the double booking; translate it to the same
      // 409 the pre-check would have produced.
      if (isDuplicateKeyError(err)) {
        const existing = await DialysisSession.findOne({
          patientId,
          scheduledDate: { $gte: startOfDay, $lt: endOfDay },
        });

        throw conflict('Patient already has a session scheduled for this date', {
          existingSessionId: existing?._id,
        });
      }

      throw err;
    }
  }

  static async updateSession(id: string, status: string) {
    const session = await DialysisSession.findById(id);

    if (!session) {
      throw notFound('Session not found');
    }

    if (status === 'in_progress' && !session.machineId) {
      throw badRequest('Cannot start session — no machine assigned');
    }

    if (status === 'in_progress' && (session.preWeight == null || session.preWeight <= 0)) {
      throw badRequest('Cannot start session — pre-session weight is required');
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
      throw notFound('Session not found');
    }

    if (!session.machineId) {
      throw badRequest('Cannot complete session — no machine assigned');
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

    const { start: startOfDay, end: endOfDay } = getDayRange(new Date(session.scheduledDate));
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
    const { start: startOfDay, end: endOfDay } = getDayRange();

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
      throw notFound('Session not found');
    }

    return session;
  }

  static async getSessionById(id: string) {
    const session = await DialysisSession.findById(id).populate(
      'patientId',
      'name mrn dryWeight'
    );

    if (!session) {
      throw notFound('Session not found');
    }

    return session;
  }

  static async reorderQueue(id: string, direction: 'up' | 'down') {
    if (direction !== 'up' && direction !== 'down') {
      throw badRequest("Direction must be 'up' or 'down'");
    }

    const session = await DialysisSession.findById(id);
    if (!session) {
      throw notFound('Session not found');
    }

    const { start: startOfDay, end: endOfDay } = getDayRange();

    const todaySessions = await DialysisSession.find({
      scheduledDate: { $gte: startOfDay, $lt: endOfDay }
    }).sort({ queuePosition: 1 });

    const currentIndex = todaySessions.findIndex(s => s._id.toString() === id);
    if (currentIndex === -1) {
      throw notFound('Session not in today schedule');
    }

    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (swapIndex < 0 || swapIndex >= todaySessions.length) {
      throw badRequest('Cannot move further in that direction');
    }

    const currentSession = todaySessions[currentIndex]!;
    const swapSession = todaySessions[swapIndex]!;

    // queuePosition is optional on the schema; fall back to the sorted index so
    // a session created without one still gets a concrete position on reorder.
    const currentPos = currentSession.queuePosition ?? currentIndex + 1;
    const swapPos = swapSession.queuePosition ?? swapIndex + 1;

    // Both writes must land or neither, otherwise a failure between them leaves
    // two sessions sharing a queue position.
    await withTransaction(async (dbSession) => {
      await DialysisSession.bulkWrite(
        [
          {
            updateOne: {
              filter: { _id: currentSession._id },
              update: { $set: { queuePosition: swapPos } },
            },
          },
          {
            updateOne: {
              filter: { _id: swapSession._id },
              update: { $set: { queuePosition: currentPos } },
            },
          },
        ],
        dbSession ? { session: dbSession } : {}
      );
    });

    return await DialysisSession.find({
      scheduledDate: { $gte: startOfDay, $lt: endOfDay }
    })
      .populate('patientId', 'name mrn dryWeight')
      .sort({ queuePosition: 1 });
  }

  static async getPaginatedSessions(queryOptions: { patientId?: unknown, page?: unknown, limit?: unknown }) {
    const { patientId, page, limit } = queryOptions;

    const query: Record<string, any> = {};

    // Express parses `?patientId[$ne]=x` into an object, and assigning it
    // straight onto the query let a caller inject Mongo operators and invert
    // the filter. Coercing to a primitive string makes that impossible.
    if (typeof patientId === 'string' && patientId.trim()) {
      query.patientId = String(patientId.trim());
    }

    const MAX_LIMIT = 100;
    const pageNum = Math.max(1, parseInt(String(page ?? '1'), 10) || 1);
    const limitNum = Math.min(
      MAX_LIMIT,
      Math.max(1, parseInt(String(limit ?? '5'), 10) || 5)
    );
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
