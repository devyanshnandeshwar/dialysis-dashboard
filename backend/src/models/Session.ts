import mongoose, { Schema, Document, Types } from 'mongoose';
import { MACHINES } from '../config/machines';
import { getDayKey } from '../utils/dateUtils';

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
  /** `YYYY-MM-DD` derived from scheduledDate; backs the one-per-patient-per-day index. */
  scheduledDay: string;
  status: 'not_started' | 'in_progress' | 'completed';
  machineId: string;
  nurseId?: string;
  preWeight?: number;
  postWeight?: number | null;
  preBloodPressure?: IBloodPressure;
  postBloodPressure?: IBloodPressure | null;
  sessionDurationMinutes?: number | null;
  targetDurationMinutes: number;
  nurseNotes?: string | null;
  queuePosition?: number;
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
    scheduledDay: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'completed'],
      default: 'not_started',
    },
    machineId: {
      type: String,
      required: true,
      validate: {
        validator: (val: string) => MACHINES.map((m) => m.id).includes(val),
        message: 'Invalid machine ID',
      },
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
    queuePosition: {
      type: Number,
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

// Keep the derived day key in lockstep with scheduledDate on every write.
DialysisSessionSchema.pre<IDialysisSession>(
  'validate',
  { document: true, query: false },
  async function () {
    if (this.scheduledDate) {
      this.scheduledDay = getDayKey(new Date(this.scheduledDate));
    }
  }
);

DialysisSessionSchema.index({ scheduledDate: 1, queuePosition: 1 });

// Enforces one session per patient per day in the database rather than relying
// on a read-then-write check in the service, which two concurrent requests can
// both pass. Also serves patientId-prefix lookups, replacing the standalone
// patientId index.
DialysisSessionSchema.index({ patientId: 1, scheduledDay: 1 }, { unique: true });

const DialysisSession = mongoose.model<IDialysisSession>(
  'DialysisSession',
  DialysisSessionSchema
);

export default DialysisSession;
