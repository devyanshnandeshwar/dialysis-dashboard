import Patient from '../models/Patient';
import DialysisSession from '../models/Session';
import { getTodayRange } from '../utils/dateUtils';

export class PatientService {
  static async createPatient(data: any) {
    const { name, mrn, dryWeight, dateOfBirth, primaryDiagnosis } = data;

    const normalizedMrn = String(mrn || '')
      .trim()
      .replace(/^MRN[-_\s]*/i, '')
      .toUpperCase();

    const existingPatient = await Patient.findOne({ mrn: normalizedMrn });
    if (existingPatient) {
      throw new Error('MRN already exists');
    }

    const patient = await Patient.create({
      name,
      mrn: normalizedMrn,
      dryWeight,
      dateOfBirth,
      primaryDiagnosis,
    });

    return patient;
  }

  static async getPatients() {
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

    return patients.map(p => {
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
  }

  static async getPatientById(id: string) {
    const patient = await Patient.findById(id);

    if (!patient) {
      throw new Error('Patient not found');
    }

    const recentSessions = await DialysisSession.find({
      patientId: patient._id,
    })
      .sort({ scheduledDate: -1 })
      .limit(5);

    return { ...patient.toObject(), recentSessions };
  }

  static async updatePatient(id: string, updateData: any) {
    delete updateData.mrn;

    const { name, dryWeight, dateOfBirth, primaryDiagnosis } = updateData;

    if (dryWeight !== undefined && (typeof dryWeight !== 'number' || dryWeight <= 0)) {
      throw new Error('dryWeight must be greater than 0');
    }

    const update: Record<string, unknown> = {};
    if (name !== undefined) update.name = name;
    if (dryWeight !== undefined) update.dryWeight = dryWeight;
    if (dateOfBirth !== undefined) update.dateOfBirth = dateOfBirth;
    if (primaryDiagnosis !== undefined) update.primaryDiagnosis = primaryDiagnosis;

    const patient = await Patient.findByIdAndUpdate(
      id,
      update,
      { new: true, runValidators: true }
    );

    if (!patient) {
      throw new Error('Patient not found');
    }

    return patient;
  }
}
