import mongoose, { Schema, Document } from 'mongoose';

export interface IPatient extends Document {
  name: string;
  mrn: string;
  dryWeight: number;
  dateOfBirth?: Date;
  primaryDiagnosis?: string;
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
  },
  {
    timestamps: true,
  }
);

PatientSchema.index({ mrn: 1 }, { unique: true });

const Patient = mongoose.model<IPatient>('Patient', PatientSchema);

export default Patient;
