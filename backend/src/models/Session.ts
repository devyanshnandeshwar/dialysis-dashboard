import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IBloodPressure {
  systolic: number;
  diastolic: number;
}

export interface IAnomaly {
  type: string;
  severity: 'warning' | 'critical';
  message: string;
}

export interface IDialysisSession extends Document {
  patientId: Types.ObjectId;
  scheduledDate: Date;
  status: 'not_started' | 'in_progress' | 'completed';
  machineId?: string;
  nurseId?: string;
  preWeight?: number;
  postWeight?: number;
  preBloodPressure?: IBloodPressure;
  postBloodPressure?: IBloodPressure;
  sessionDurationMinutes?: number;
  targetDurationMinutes: number;
  nurseNotes?: string;
  anomalies: IAnomaly[];
}

const BloodPressureSchema = new Schema<IBloodPressure>(
  {
    systolic: { type: Number },
    diastolic: { type: Number },
  },
  { _id: false }
);

const AnomalySchema = new Schema<IAnomaly>(
  {
    type: { type: String, required: true },
    severity: {
      type: String,
      enum: ['warning', 'critical'],
      required: true,
    },
    message: { type: String, required: true },
  },
  { _id: false }
);

const DialysisSessionSchema = new Schema<IDialysisSession>(
  {
    patientId: {
      type: Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },
    scheduledDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'completed'],
      default: 'not_started',
    },
    machineId: {
      type: String,
    },
    nurseId: {
      type: String,
    },
    preWeight: {
      type: Number,
    },
    postWeight: {
      type: Number,
    },
    preBloodPressure: {
      type: BloodPressureSchema,
    },
    postBloodPressure: {
      type: BloodPressureSchema,
    },
    sessionDurationMinutes: {
      type: Number,
    },
    targetDurationMinutes: {
      type: Number,
      default: 240,
    },
    nurseNotes: {
      type: String,
    },
    anomalies: {
      type: [AnomalySchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

const DialysisSession = mongoose.model<IDialysisSession>(
  'DialysisSession',
  DialysisSessionSchema
);

export default DialysisSession;
