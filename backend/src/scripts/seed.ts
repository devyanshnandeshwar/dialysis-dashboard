import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Patient from '../models/Patient';

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

    // Clear existing patients
    await Patient.deleteMany({});
    console.log('Cleared existing patients');

    // Insert seed data
    const created = await Patient.insertMany(patients);
    console.log(`Seeded ${created.length} patients:`);
    created.forEach((p) => console.log(`  - ${p.name} (${p.mrn})`));

    await mongoose.disconnect();
    console.log('Seeding complete');
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
};

seed();
