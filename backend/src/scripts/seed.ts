import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Patient from '../models/Patient';
import DialysisSession from '../models/Session';
import anomalyConfig from '../config/anomalyConfig';
import detectAnomalies from '../utils/anomalyDetector';

dotenv.config();

const patients = [
  {
    name: 'John Carter',
    mrn: 'MRN-001',
    dryWeight: 72,
    dateOfBirth: new Date('1965-03-15'),
    primaryDiagnosis: 'Chronic Kidney Disease Stage 5',
    assignedUnit: 'Unit A',
  },
  {
    name: 'Maria Santos',
    mrn: 'MRN-002',
    dryWeight: 65,
    dateOfBirth: new Date('1978-07-22'),
    primaryDiagnosis: 'Diabetic Nephropathy',
    assignedUnit: 'Unit A',
  },
  {
    name: 'David Okafor',
    mrn: 'MRN-003',
    dryWeight: 88,
    dateOfBirth: new Date('1960-11-04'),
    primaryDiagnosis: 'Hypertensive Nephrosclerosis',
    assignedUnit: 'Unit B',
  },
  {
    name: 'Priya Nair',
    mrn: 'MRN-004',
    dryWeight: 58,
    dateOfBirth: new Date('1985-01-30'),
    primaryDiagnosis: 'Polycystic Kidney Disease',
    assignedUnit: 'Unit B',
  },
  {
    name: 'Robert Chen',
    mrn: 'MRN-005',
    dryWeight: 79,
    dateOfBirth: new Date('1972-09-18'),
    primaryDiagnosis: 'Glomerulonephritis',
    assignedUnit: 'Unit A',
  },
];

const seed = async () => {
  try {
    const mongoURI = process.env.MONGO_URI;
    if (!mongoURI) {
      throw new Error('MONGO_URI is not defined in environment variables');
    }

    await mongoose.connect(mongoURI);
    console.log('MongoDB connected for seeding');

    // Clear existing data
    await DialysisSession.deleteMany({});
    await Patient.deleteMany({});
    console.log('Cleared existing patients and sessions');

    // Insert patients
    const createdPatients = await Patient.insertMany(patients);
    console.log(`Seeded ${createdPatients.length} patients:`);
    createdPatients.forEach((p) => console.log(`  - ${p.name} (${p.mrn})`));

    // Build a lookup by MRN
    const byMrn = (mrn: string) => {
      const p = createdPatients.find((pt) => pt.mrn === mrn);
      if (!p) throw new Error(`Patient ${mrn} not found`);
      return p;
    };

    const today = new Date();
    today.setHours(9, 0, 0, 0); // 9AM today

    // --- Session data for today ---
    const sessionInputs = [
      {
        // John Carter: in_progress, weight anomaly (gain 3kg) + BP anomaly (165/95)
        patientId: byMrn('MRN-001')._id,
        scheduledDate: today,
        status: 'in_progress' as const,
        machineId: 'HD-01',
        nurseId: 'N-201',
        preWeight: 75, // gain = 75 - 72 = 3kg → critical (> 2 * 1.5)
        postWeight: 72.5,
        preBloodPressure: { systolic: 145, diastolic: 88 },
        postBloodPressure: { systolic: 165, diastolic: 95 }, // > 160 → critical
        sessionDurationMinutes: 200,
        targetDurationMinutes: 240,
        nurseNotes: 'Patient reports mild headache during session.',
      },
      {
        // Maria Santos: completed, all normal values
        patientId: byMrn('MRN-002')._id,
        scheduledDate: today,
        status: 'completed' as const,
        machineId: 'HD-02',
        nurseId: 'N-202',
        preWeight: 66.5, // gain = 1.5kg → normal
        postWeight: 65,
        preBloodPressure: { systolic: 130, diastolic: 80 },
        postBloodPressure: { systolic: 125, diastolic: 78 },
        sessionDurationMinutes: 235,
        targetDurationMinutes: 240,
        nurseNotes: 'Uneventful session. Patient tolerated well.',
      },
      {
        // David Okafor: not_started
        patientId: byMrn('MRN-003')._id,
        scheduledDate: today,
        status: 'not_started' as const,
        machineId: 'HD-03',
        nurseId: 'N-203',
        targetDurationMinutes: 240,
      },
      {
        // Priya Nair: in_progress, short session anomaly (180 < 240 - 30)
        patientId: byMrn('MRN-004')._id,
        scheduledDate: today,
        status: 'in_progress' as const,
        machineId: 'HD-04',
        nurseId: 'N-201',
        preWeight: 59.5, // gain = 1.5kg → normal
        postWeight: 58.2,
        preBloodPressure: { systolic: 128, diastolic: 76 },
        postBloodPressure: { systolic: 132, diastolic: 80 },
        sessionDurationMinutes: 180, // 180 < 240 - 30 = 210 → short_session warning
        targetDurationMinutes: 240,
        nurseNotes: 'Session shortened due to patient discomfort.',
      },
      {
        // Robert Chen: not_started
        patientId: byMrn('MRN-005')._id,
        scheduledDate: today,
        status: 'not_started' as const,
        machineId: 'HD-05',
        nurseId: 'N-204',
        targetDurationMinutes: 240,
      },
    ];

    // Run anomaly detection on each session before inserting
    const sessionsToInsert = sessionInputs.map((input, index) => {
      const patient = createdPatients.find(
        (p) => p._id.toString() === input.patientId.toString()
      )!;
      const anomalies = detectAnomalies(input, patient, anomalyConfig);
      return { ...input, anomalies, queuePosition: index + 1 };
    });

    const createdSessions = await DialysisSession.insertMany(sessionsToInsert);
    console.log(`\nSeeded ${createdSessions.length} sessions for today:`);
    createdSessions.forEach((s) => {
      const anomalyCount = s.anomalies.length;
      console.log(
        `  - ${s.status.padEnd(12)} | Machine ${s.machineId || 'N/A'} | ${anomalyCount} anomal${anomalyCount === 1 ? 'y' : 'ies'}`
      );
    });

    await mongoose.disconnect();
    console.log('\nSeeding complete');
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
};

seed();
