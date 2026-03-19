import mongoose, { Schema, Document } from 'mongoose';

export interface IPatient extends Document {
  name: string;
  mrn: string;
  dryWeight: number;
  dateOfBirth?: Date;
  primaryDiagnosis?: string;
  assignedUnit?: string;
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
    assignedUnit: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const Patient = mongoose.model<IPatient>('Patient', PatientSchema);

export default Patient;
