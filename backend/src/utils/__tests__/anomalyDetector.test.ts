import detectAnomalies from '../anomalyDetector';

const defaultConfig = {
  EXCESS_WEIGHT_GAIN_KG: 2.0,
  HIGH_SYSTOLIC_BP_MMHG: 160,
  SHORT_SESSION_DEVIATION_MINUTES: 30,
  LONG_SESSION_DEVIATION_MINUTES: 60,
};

const normalPatient = { dryWeight: 72 };

describe('detectAnomalies', () => {
  it('returns empty array for normal values', () => {
    const session = {
      preWeight: 73.5, // gain = 1.5 < 2.0
      postBloodPressure: { systolic: 130, diastolic: 80 },
      sessionDurationMinutes: 235,
      targetDurationMinutes: 240,
    };
    const result = detectAnomalies(session, normalPatient, defaultConfig);
    expect(result).toEqual([]);
  });

  it('returns warning for weight gain of 2.5kg', () => {
    const session = {
      preWeight: 74.5, // gain = 2.5 > 2.0, < 3.0
      targetDurationMinutes: 240,
    };
    const result = detectAnomalies(session, normalPatient, defaultConfig);
    expect(result).toHaveLength(1);
    expect(result[0]!.type).toBe('excess_weight_gain');
    expect(result[0]!.severity).toBe('warning');
    expect(result[0]!.message).toContain('2.5');
  });

  it('returns critical for weight gain of 3.5kg (> threshold * 1.5)', () => {
    const session = {
      preWeight: 75.5, // gain = 3.5 > 3.0
      targetDurationMinutes: 240,
    };
    const result = detectAnomalies(session, normalPatient, defaultConfig);
    expect(result).toHaveLength(1);
    expect(result[0]!.type).toBe('excess_weight_gain');
    expect(result[0]!.severity).toBe('critical');
  });

  it('returns critical for post-BP systolic of 170 mmHg', () => {
    const session = {
      postBloodPressure: { systolic: 170, diastolic: 95 },
      targetDurationMinutes: 240,
    };
    const result = detectAnomalies(session, normalPatient, defaultConfig);
    expect(result).toHaveLength(1);
    expect(result[0]!.type).toBe('high_post_bp');
    expect(result[0]!.severity).toBe('critical');
    expect(result[0]!.message).toContain('170');
  });

  it('returns short_session warning for 190min vs 240min target', () => {
    const session = {
      sessionDurationMinutes: 190, // 190 < 240 - 30 = 210
      targetDurationMinutes: 240,
    };
    const result = detectAnomalies(session, normalPatient, defaultConfig);
    expect(result).toHaveLength(1);
    expect(result[0]!.type).toBe('short_session');
    expect(result[0]!.severity).toBe('warning');
  });

  it('returns long_session warning for 310min vs 240min target', () => {
    const session = {
      sessionDurationMinutes: 310, // 310 > 240 + 60 = 300
      targetDurationMinutes: 240,
    };
    const result = detectAnomalies(session, normalPatient, defaultConfig);
    expect(result).toHaveLength(1);
    expect(result[0]!.type).toBe('long_session');
    expect(result[0]!.severity).toBe('warning');
  });

  it('returns three anomalies when all rules trigger', () => {
    const session = {
      preWeight: 75.5, // gain = 3.5 → critical
      postBloodPressure: { systolic: 170, diastolic: 95 }, // → critical
      sessionDurationMinutes: 190, // → short_session warning
      targetDurationMinutes: 240,
    };
    const result = detectAnomalies(session, normalPatient, defaultConfig);
    expect(result).toHaveLength(3);

    const types = result.map((a) => a.type);
    expect(types).toContain('excess_weight_gain');
    expect(types).toContain('high_post_bp');
    expect(types).toContain('short_session');
  });
});
