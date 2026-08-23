import detectAnomalies from '../anomalyDetector';
import anomalyConfig from '../../config/anomalyConfig';

describe('Anomaly Detector', () => {
  const basePatient = { _id: 'p1', name: 'Test', mrn: '123', dryWeight: 72 };
  
  const baseSession = {
    patientId: 'p1',
    scheduledDate: new Date().toISOString(),
    status: 'completed' as const,
    preWeight: 72.5, // 0.5kg gain -> safe
    postWeight: 72,
    preBloodPressure: { systolic: 120, diastolic: 80 },
    postBloodPressure: { systolic: 120, diastolic: 80 },
    sessionDurationMinutes: 240,
    targetDurationMinutes: 240,
  };

  it('returns empty array when values are normal', () => {
    const anomalies = detectAnomalies(baseSession, basePatient, anomalyConfig);
    expect(anomalies).toEqual([]);
  });

  it('returns warning when weight gain is between warning and critical thresholds', () => {
    const session = { ...baseSession, preWeight: 74.5 }; // gain = 2.5kg
    const anomalies = detectAnomalies(session, basePatient, anomalyConfig);
    expect(anomalies).toHaveLength(1);
    expect(anomalies[0]).toMatchObject({
      type: 'excess_weight_gain',
      severity: 'warning'
    });
  });

  it('returns critical when weight gain exceeds critical threshold', () => {
    const session = { ...baseSession, preWeight: 75.5 }; // gain = 3.5kg
    const anomalies = detectAnomalies(session, basePatient, anomalyConfig);
    expect(anomalies).toHaveLength(1);
    expect(anomalies[0]).toMatchObject({
      type: 'excess_weight_gain',
      severity: 'critical'
    });
  });

  // Thresholds are documented in the README as ">=", so a value landing exactly
  // on one must flag.
  it('flags a weight gain sitting exactly on the warning threshold', () => {
    const session = { ...baseSession, preWeight: 74 }; // gain = 2.0kg exactly
    const anomalies = detectAnomalies(session, basePatient, anomalyConfig);
    expect(anomalies).toHaveLength(1);
    expect(anomalies[0]).toMatchObject({
      type: 'excess_weight_gain',
      severity: 'warning'
    });
  });

  it('flags a weight gain sitting exactly on the critical threshold', () => {
    const session = { ...baseSession, preWeight: 75 }; // gain = 3.0kg exactly
    const anomalies = detectAnomalies(session, basePatient, anomalyConfig);
    expect(anomalies).toHaveLength(1);
    expect(anomalies[0]).toMatchObject({
      type: 'excess_weight_gain',
      severity: 'critical'
    });
  });

  it('leaves a weight gain just under the warning threshold alone', () => {
    const session = { ...baseSession, preWeight: 73.9 }; // gain = 1.9kg
    const anomalies = detectAnomalies(session, basePatient, anomalyConfig);
    expect(anomalies).toEqual([]);
  });

  it('reports the critical threshold, not the warning one, in a critical message', () => {
    const session = { ...baseSession, preWeight: 75.5 };
    const anomalies = detectAnomalies(session, basePatient, anomalyConfig);
    expect(anomalies[0]!.message).toContain(`${anomalyConfig.CRITICAL_WEIGHT_GAIN_KG}kg`);
    expect(anomalies[0]!.message).not.toContain(`${anomalyConfig.EXCESS_WEIGHT_GAIN_KG}kg`);
  });

  it('flags a post BP sitting exactly on the threshold', () => {
    const session = {
      ...baseSession,
      postBloodPressure: { systolic: anomalyConfig.HIGH_SYSTOLIC_BP_MMHG, diastolic: 90 }
    };
    const anomalies = detectAnomalies(session, basePatient, anomalyConfig);
    expect(anomalies).toHaveLength(1);
    expect(anomalies[0]).toMatchObject({
      type: 'high_post_bp',
      severity: 'critical'
    });
  });

  it('returns critical when post BP systolic is dangerously high', () => {
    const session = { 
      ...baseSession, 
      postBloodPressure: { systolic: 170, diastolic: 90 } 
    };
    const anomalies = detectAnomalies(session, basePatient, anomalyConfig);
    expect(anomalies).toHaveLength(1);
    expect(anomalies[0]).toMatchObject({
      type: 'high_post_bp',
      severity: 'critical'
    });
  });

  it('returns warning for a short session', () => {
    const session = { ...baseSession, sessionDurationMinutes: 190 };
    const anomalies = detectAnomalies(session, basePatient, anomalyConfig);
    expect(anomalies).toHaveLength(1);
    expect(anomalies[0]).toMatchObject({
      type: 'short_session',
      severity: 'warning'
    });
  });

  it('returns warning for a long session', () => {
    const session = { ...baseSession, sessionDurationMinutes: 310 };
    const anomalies = detectAnomalies(session, basePatient, anomalyConfig);
    expect(anomalies).toHaveLength(1);
    expect(anomalies[0]).toMatchObject({
      type: 'long_session',
      severity: 'warning'
    });
  });

  it('returns multiple anomalies when all three are triggered simultaneously', () => {
    const session = { 
      ...baseSession, 
      preWeight: 75.5, // Critical weight
      postBloodPressure: { systolic: 170, diastolic: 90 }, // Critical BP
      sessionDurationMinutes: 190 // Warning duration
    };
    const anomalies = detectAnomalies(session, basePatient, anomalyConfig);
    expect(anomalies).toHaveLength(3);
    
    const types = anomalies.map(a => a.type);
    expect(types).toContain('excess_weight_gain');
    expect(types).toContain('high_post_bp');
    expect(types).toContain('short_session');
  });
});
