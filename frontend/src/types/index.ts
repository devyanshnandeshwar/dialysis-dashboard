export interface BloodPressure {
  systolic: number;
  diastolic: number;
}

export interface Anomaly {
  type: string;
  severity: 'warning' | 'critical';
  message: string;
}

export interface HDMachine {
  id: string;
  name: string;
  type: 'Hemodialysis';
  status: 'available' | 'in_use';
}

export interface Patient {
  _id: string;
  name: string;
  mrn: string;
  dryWeight: number;
  dateOfBirth?: string;
  primaryDiagnosis?: string;
  assignedUnit?: string;
  createdAt: string;
  updatedAt: string;
  totalSessions?: number;
  lastSession?: {
    date: string;
    status: 'not_started' | 'in_progress' | 'completed';
  } | null;
  lastAnomalies?: Anomaly[];
}

export interface DialysisSession {
  _id: string;
  patientId: Patient | string;
  scheduledDate: string;
  status: 'not_started' | 'in_progress' | 'completed';
  machineId?: string;
  nurseId?: string;
  preWeight?: number;
  postWeight?: number | null;
  preBloodPressure?: BloodPressure;
  postBloodPressure?: BloodPressure | null;
  sessionDurationMinutes?: number | null;
  targetDurationMinutes: number;
  nurseNotes?: string | null;
  queuePosition?: number;
  anomalies: Anomaly[];
  createdAt: string;
  updatedAt: string;
}
