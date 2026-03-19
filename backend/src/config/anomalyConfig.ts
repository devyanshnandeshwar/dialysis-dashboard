/**
 * Clinical anomaly detection thresholds.
 *
 * These values are used to flag abnormal readings during or around
 * a dialysis session so nurses and physicians can intervene early.
 */
const anomalyConfig = {
  /**
   * Maximum acceptable interdialytic weight gain (kg).
   * Gains above 2 kg between sessions suggest excessive fluid intake
   * and increase the risk of pulmonary edema and hypertension.
   */
  EXCESS_WEIGHT_GAIN_KG: 2.0,

  /**
   * Upper systolic blood-pressure threshold (mmHg).
   * A pre- or post-session systolic reading ≥ 160 mmHg is classified
   * as stage-2 hypertension and may require medication adjustment
   * or session modification to prevent cardiovascular events.
   */
  HIGH_SYSTOLIC_BP_MMHG: 160,

  /**
   * Allowed negative deviation from the target session duration (minutes).
   * Sessions ending more than 30 minutes early may indicate inadequate
   * solute clearance (low Kt/V), raising the risk of uremic symptoms.
   */
  SHORT_SESSION_DEVIATION_MINUTES: 30,

  /**
   * Allowed positive deviation from the target session duration (minutes).
   * Sessions running more than 60 minutes over target could signal
   * access issues, clotting, or machine malfunctions and may increase
   * the risk of hypotension and patient discomfort.
   */
  LONG_SESSION_DEVIATION_MINUTES: 60,
} as const;

export default anomalyConfig;
