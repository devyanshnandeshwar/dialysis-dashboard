import { IAnomaly } from '../models/Session';

interface SessionData {
  preWeight?: number;
  postWeight?: number;
  postBloodPressure?: { systolic: number; diastolic: number };
  sessionDurationMinutes?: number;
  targetDurationMinutes: number;
}

interface PatientData {
  dryWeight: number;
}

interface AnomalyConfig {
  EXCESS_WEIGHT_GAIN_KG: number;
  HIGH_SYSTOLIC_BP_MMHG: number;
  SHORT_SESSION_DEVIATION_MINUTES: number;
  LONG_SESSION_DEVIATION_MINUTES: number;
}

/**
 * Pure function — detects clinical anomalies for a dialysis session.
 * Returns an array of anomaly objects to be stored on the session document.
 */
const detectAnomalies = (
  session: SessionData,
  patient: PatientData,
  config: AnomalyConfig
): IAnomaly[] => {
  const anomalies: IAnomaly[] = [];

  // Rule 1 — Excess interdialytic weight gain
  if (session.preWeight != null) {
    const gain = session.preWeight - patient.dryWeight;
    const criticalThreshold = config.EXCESS_WEIGHT_GAIN_KG * 1.5;

    if (gain > criticalThreshold) {
      anomalies.push({
        type: 'excess_weight_gain',
        severity: 'critical',
        message: `Interdialytic weight gain of ${gain.toFixed(1)}kg exceeds threshold of ${config.EXCESS_WEIGHT_GAIN_KG}kg`,
      });
    } else if (gain > config.EXCESS_WEIGHT_GAIN_KG) {
      anomalies.push({
        type: 'excess_weight_gain',
        severity: 'warning',
        message: `Interdialytic weight gain of ${gain.toFixed(1)}kg exceeds threshold of ${config.EXCESS_WEIGHT_GAIN_KG}kg`,
      });
    }
  }

  // Rule 2 — High post-dialysis systolic BP
  if (session.postBloodPressure?.systolic != null) {
    if (session.postBloodPressure.systolic > config.HIGH_SYSTOLIC_BP_MMHG) {
      anomalies.push({
        type: 'high_post_bp',
        severity: 'critical',
        message: `Post-dialysis systolic BP ${session.postBloodPressure.systolic} mmHg exceeds ${config.HIGH_SYSTOLIC_BP_MMHG} mmHg`,
      });
    }
  }

  // Rule 3 — Abnormal session duration
  if (session.sessionDurationMinutes != null) {
    const { sessionDurationMinutes: actual, targetDurationMinutes: target } =
      session;

    if (actual < target - config.SHORT_SESSION_DEVIATION_MINUTES) {
      anomalies.push({
        type: 'short_session',
        severity: 'warning',
        message: `Session duration ${actual} min is short relative to target ${target} min`,
      });
    } else if (actual > target + config.LONG_SESSION_DEVIATION_MINUTES) {
      anomalies.push({
        type: 'long_session',
        severity: 'warning',
        message: `Session duration ${actual} min is long relative to target ${target} min`,
      });
    }
  }

  return anomalies;
};

export default detectAnomalies;
