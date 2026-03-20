import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import SessionCard from '../SessionCard';
import type { DialysisSession } from '@/types';

const baseSession: DialysisSession = {
  _id: 'sess-1',
  patientId: {
    _id: 'pat-1',
    name: 'John Carter',
    mrn: 'MRN-001',
    dryWeight: 72,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
  scheduledDate: new Date().toISOString(),
  status: 'in_progress',
  machineId: 'M-101',
  preWeight: 75,
  postWeight: 72.5,
  preBloodPressure: { systolic: 140, diastolic: 85 },
  postBloodPressure: { systolic: 130, diastolic: 80 },
  sessionDurationMinutes: 230,
  targetDurationMinutes: 240,
  nurseNotes: 'Patient is stable.',
  anomalies: [],
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
};

function renderCard(session: DialysisSession) {
  return render(
    <BrowserRouter>
      <SessionCard session={session} sequenceNumber={1} />
    </BrowserRouter>
  );
}

describe('SessionCard', () => {
  it('renders patient name and MRN', () => {
    renderCard(baseSession);
    expect(screen.getByText('John Carter')).toBeDefined();
    expect(screen.getByText(/MRN-001/)).toBeDefined();
  });

  it('shows critical anomaly badge when anomalies has critical severity', () => {
    const session: DialysisSession = {
      ...baseSession,
      anomalies: [
        {
          type: 'high_post_bp',
          severity: 'critical',
          message: 'Post-dialysis systolic BP 170 mmHg exceeds 160 mmHg',
        },
      ],
    };
    renderCard(session);
    expect(screen.getByText('HIGH POST BP')).toBeDefined();
  });

  it('shows no anomaly badges when anomalies array is empty', () => {
    renderCard(baseSession);
    expect(screen.queryByText('Weight Gain')).toBeNull();
    expect(screen.queryByText('High BP')).toBeNull();
    expect(screen.queryByText('Short Session')).toBeNull();
    expect(screen.queryByText('Long Session')).toBeNull();
  });
});
