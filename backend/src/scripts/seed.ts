import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Patient from '../models/Patient';
import DialysisSession from '../models/Session';

dotenv.config();

export const seedDatabase = async () => {
  await Patient.deleteMany({});
  await DialysisSession.deleteMany({});

  const john = await Patient.create({
    name: 'John Carter',
    mrn: 'MRN-001',
    dryWeight: 72,
    dateOfBirth: new Date('1965-03-15'),
    primaryDiagnosis: 'End-Stage Renal Disease',
    assignedUnit: 'Unit A',
  });

  const maria = await Patient.create({
    name: 'Maria Santos',
    mrn: 'MRN-002',
    dryWeight: 65,
    dateOfBirth: new Date('1972-07-22'),
    primaryDiagnosis: 'Chronic Kidney Disease',
    assignedUnit: 'Unit A',
  });

  const david = await Patient.create({
    name: 'David Okafor',
    mrn: 'MRN-003',
    dryWeight: 88,
    dateOfBirth: new Date('1958-11-08'),
    primaryDiagnosis: 'Diabetic Nephropathy',
    assignedUnit: 'Unit B',
  });

  const priya = await Patient.create({
    name: 'Priya Nair',
    mrn: 'MRN-004',
    dryWeight: 58,
    dateOfBirth: new Date('1980-01-30'),
    primaryDiagnosis: 'Hypertensive Nephropathy',
    assignedUnit: 'Unit B',
  });

  const robert = await Patient.create({
    name: 'Robert Chen',
    mrn: 'MRN-005',
    dryWeight: 79,
    dateOfBirth: new Date('1969-09-14'),
    primaryDiagnosis: 'Polycystic Kidney Disease',
    assignedUnit: 'Unit C',
  });

  const today = new Date();
  today.setHours(12, 0, 0, 0);

  await DialysisSession.create({
    patientId: john._id,
    scheduledDate: today,
    status: 'in_progress',
    machineId: 'HD-01',
    queuePosition: 1,
    preWeight: 75,
    postWeight: null,
    preBloodPressure: { systolic: 145, diastolic: 88 },
    postBloodPressure: { systolic: 165, diastolic: 95 },
    sessionDurationMinutes: 200,
    targetDurationMinutes: 240,
    nurseNotes: '',
    anomalies: [],
  });

  await DialysisSession.create({
    patientId: maria._id,
    scheduledDate: today,
    status: 'completed',
    machineId: 'HD-02',
    queuePosition: 2,
    preWeight: 66.5,
    postWeight: 65,
    preBloodPressure: { systolic: 130, diastolic: 80 },
    postBloodPressure: { systolic: 125, diastolic: 78 },
    sessionDurationMinutes: 235,
    targetDurationMinutes: 240,
    nurseNotes: 'Session completed without issues.',
    anomalies: [],
  });

  await DialysisSession.create({
    patientId: david._id,
    scheduledDate: today,
    status: 'not_started',
    machineId: 'HD-03',
    queuePosition: 3,
    postWeight: null,
    postBloodPressure: null,
    sessionDurationMinutes: null,
    targetDurationMinutes: 240,
    nurseNotes: '',
    anomalies: [],
  });

  await DialysisSession.create({
    patientId: priya._id,
    scheduledDate: today,
    status: 'in_progress',
    machineId: 'HD-04',
    queuePosition: 4,
    preWeight: 59.5,
    postWeight: null,
    preBloodPressure: { systolic: 128, diastolic: 76 },
    postBloodPressure: { systolic: 132, diastolic: 80 },
    sessionDurationMinutes: 180,
    targetDurationMinutes: 240,
    nurseNotes: '',
    anomalies: [],
  });

  await DialysisSession.create({
    patientId: robert._id,
    scheduledDate: today,
    status: 'not_started',
    machineId: 'HD-05',
    queuePosition: 5,
    postWeight: null,
    postBloodPressure: null,
    sessionDurationMinutes: null,
    targetDurationMinutes: 240,
    nurseNotes: '',
    anomalies: [],
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
