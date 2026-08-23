import mongoose, { Schema, Document } from 'mongoose';

export interface IPatient extends Document {
  name: string;
  mrn: string;
  dryWeight: number;
  dateOfBirth?: Date;
  primaryDiagnosis?: string;
  gender?: 'Male' | 'Female' | 'Other';
  phoneNumber?: string;
}

const PatientSchema = new Schema<IPatient>(
  {
    name: {
      type: String,
      required: true,
    },
    mrn: {
      type: String,
      required: true,
      unique: true,
      set: (value: string) =>
        String(value || '')
          .trim()
          .replace(/^MRN[-_\s]*/i, '')
          .toUpperCase(),
    },
    dryWeight: {
      type: Number,
      required: true,
    },
    dateOfBirth: {
      type: Date,
    },
    primaryDiagnosis: {
      type: String,
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other'],
    },
    phoneNumber: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// `unique: true` on the mrn path already declares the unique index — declaring
// it again here made Mongoose warn about a duplicate index on every boot.

const Patient = mongoose.model<IPatient>('Patient', PatientSchema);

export default Patient;
