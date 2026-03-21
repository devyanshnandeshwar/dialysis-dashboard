import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Patient from '../models/Patient';
import DialysisSession from '../models/Session';

dotenv.config();

export const seedDatabase = async () => {
  await Patient.deleteMany({});
  await DialysisSession.deleteMany({});

  const ananya = await Patient.create({
    name: 'Ananya Patel',
    mrn: '1001',
    dryWeight: 62,
    dateOfBirth: new Date('1988-06-12'),
    primaryDiagnosis: 'End-Stage Renal Disease',
  });

  const michael = await Patient.create({
    name: 'Michael Reyes',
    mrn: '1002',
    dryWeight: 74,
    dateOfBirth: new Date('1975-11-03'),
    primaryDiagnosis: 'Chronic Kidney Disease',
  });

  const farah = await Patient.create({
    name: 'Farah Khan',
    mrn: '1003',
    dryWeight: 58,
    dateOfBirth: new Date('1990-02-18'),
    primaryDiagnosis: 'Hypertensive Nephropathy',
  });

  const leo = await Patient.create({
    name: 'Leo Martins',
    mrn: '1004',
    dryWeight: 81,
    dateOfBirth: new Date('1967-09-27'),
    primaryDiagnosis: 'Diabetic Nephropathy',
  });

  const nora = await Patient.create({
    name: 'Nora Ibrahim',
    mrn: '1005',
    dryWeight: 69,
    dateOfBirth: new Date('1983-01-08'),
    primaryDiagnosis: 'Polycystic Kidney Disease',
  });

  // Registered but not scheduled (no sessions today)
  await Patient.create({
    name: 'Omar Haddad',
    mrn: '1006',
    dryWeight: 76,
    dateOfBirth: new Date('1992-05-14'),
    primaryDiagnosis: 'Glomerulonephritis',
  });

  const today = new Date();
  today.setHours(12, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  await DialysisSession.create({
    // In progress + anomalies
    patientId: ananya._id,
    scheduledDate: today,
    status: 'in_progress',
    machineId: 'HD-01',
    queuePosition: 1,
    preWeight: 66,
    postWeight: null,
    preBloodPressure: { systolic: 152, diastolic: 90 },
    postBloodPressure: { systolic: 168, diastolic: 96 },
    sessionDurationMinutes: 175,
    targetDurationMinutes: 240,
    nurseNotes: 'Headache reported. Monitoring vitals closely.',
    anomalies: [
      {
        type: 'high_post_bp',
        severity: 'critical',
        message: 'Post-dialysis systolic BP 168 mmHg exceeds threshold',
      },
      {
        type: 'short_session',
        severity: 'warning',
        message: 'Session duration is significantly below target',
      },
    ],
  });

  await DialysisSession.create({
    // Completed + normal
    patientId: michael._id,
    scheduledDate: today,
    status: 'completed',
    machineId: 'HD-02',
    queuePosition: 2,
    preWeight: 75.2,
    postWeight: 74,
    preBloodPressure: { systolic: 132, diastolic: 82 },
    postBloodPressure: { systolic: 126, diastolic: 78 },
    sessionDurationMinutes: 238,
    targetDurationMinutes: 240,
    nurseNotes: 'Stable run, no adverse events.',
    anomalies: [],
  });

  await DialysisSession.create({
    // Registered + scheduled (upcoming)
    patientId: farah._id,
    scheduledDate: today,
    status: 'not_started',
    machineId: 'HD-03',
    queuePosition: 3,
    postWeight: null,
    postBloodPressure: null,
    sessionDurationMinutes: null,
    targetDurationMinutes: 240,
    nurseNotes: 'Awaiting machine prep.',
    anomalies: [],
  });

  await DialysisSession.create({
    // In progress + normal
    patientId: leo._id,
    scheduledDate: today,
    status: 'in_progress',
    machineId: 'HD-04',
    queuePosition: 4,
    preWeight: 82,
    postWeight: null,
    preBloodPressure: { systolic: 136, diastolic: 84 },
    postBloodPressure: { systolic: 138, diastolic: 82 },
    sessionDurationMinutes: 215,
    targetDurationMinutes: 240,
    nurseNotes: 'Progressing normally.',
    anomalies: [],
  });

  await DialysisSession.create({
    // Completed + anomaly for validation scenarios
    patientId: nora._id,
    scheduledDate: yesterday,
    status: 'completed',
    machineId: 'HD-05',
    queuePosition: 5,
    preWeight: 71,
    postWeight: 69.2,
    preBloodPressure: { systolic: 142, diastolic: 86 },
    postBloodPressure: { systolic: 150, diastolic: 88 },
    sessionDurationMinutes: 250,
    targetDurationMinutes: 240,
    nurseNotes: 'Slightly extended session duration.',
    anomalies: [
      {
        type: 'long_session',
        severity: 'warning',
        message: 'Session duration exceeded target by more than threshold',
      },
    ],
  });

  console.log('✅ Database seeded successfully');
};

const runSeedScript = async () => {
  const mongoURI = process.env.MONGO_URI;
  if (!mongoURI) {
    throw new Error('MONGO_URI is not defined in environment variables');
  }

  await mongoose.connect(mongoURI);
  console.log('MongoDB connected for seeding');

  try {
    await seedDatabase();
  } finally {
    await mongoose.disconnect();
  }
};

if (require.main === module) {
  runSeedScript()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seeding failed:', err);
      process.exit(1);
    });
}
