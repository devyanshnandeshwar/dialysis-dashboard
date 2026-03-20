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
