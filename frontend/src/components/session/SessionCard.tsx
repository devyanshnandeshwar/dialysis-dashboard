import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import StatusBadge from '@/components/ui/StatusBadge';
import AnomalyBadge from '@/components/ui/AnomalyBadge';
import NotesEditor from '@/components/session/NotesEditor';
import { Weight, HeartPulse, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import type { DialysisSession, Patient } from '@/types';

function getBorderColor(session: DialysisSession): string {
  const hasCritical = session.anomalies.some((a) => a.severity === 'critical');
  const hasWarning = session.anomalies.some((a) => a.severity === 'warning');

  if (hasCritical) return 'border-l-critical';
  if (hasWarning) return 'border-l-warning';
  if (session.status === 'completed' && session.anomalies.length === 0) return 'border-l-success';
  return 'border-l-border-custom';
}

export default function SessionCard({ session }: { session: DialysisSession }) {
  const [expanded, setExpanded] = useState(false);
  const [currentNotes, setCurrentNotes] = useState(session.nurseNotes || '');
  const patient = session.patientId as Patient;

  return (
    <Card
      className={`bg-surface border-border-custom border-l-4 ${getBorderColor(session)} cursor-pointer transition-all hover:bg-surface-alt/50`}
      onClick={() => setExpanded(!expanded)}
    >
      <CardContent className="p-4">
        {/* Top row */}
        <div className="flex items-start justify-between gap-4">
          {/* Left: patient info + status */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-semibold text-text-primary truncate">
                {patient.name}
              </h3>
              <StatusBadge status={session.status} />
            </div>
            <p className="text-xs text-text-muted">
              MRN: {patient.mrn}
              {session.machineId && <span className="ml-3">Machine: {session.machineId}</span>}
            </p>
          </div>

          {/* Middle: vitals */}
          <div className="hidden md:flex items-center gap-6 text-xs text-text-muted">
            {(session.preWeight != null || session.postWeight != null) && (
              <div className="flex items-center gap-1.5">
                <Weight className="w-3.5 h-3.5 text-brand" />
                <span>
                  {session.preWeight ?? '—'} → {session.postWeight ?? '—'} kg
                </span>
              </div>
            )}
            {(session.preBloodPressure || session.postBloodPressure) && (
              <div className="flex items-center gap-1.5">
                <HeartPulse className="w-3.5 h-3.5 text-critical" />
                <span>
                  {session.preBloodPressure
                    ? `${session.preBloodPressure.systolic}/${session.preBloodPressure.diastolic}`
                    : '—'}{' '}
                  →{' '}
                  {session.postBloodPressure
                    ? `${session.postBloodPressure.systolic}/${session.postBloodPressure.diastolic}`
                    : '—'}
                </span>
              </div>
            )}
            {session.sessionDurationMinutes != null && (
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-warning" />
                <span>
                  {session.sessionDurationMinutes}/{session.targetDurationMinutes} min
                </span>
              </div>
            )}
          </div>

          {/* Right: anomaly badges + expand */}
          <div className="flex items-center gap-2 shrink-0">
            {session.anomalies.length > 0 && (
              <div className="flex gap-1 flex-wrap justify-end">
                {session.anomalies.map((anomaly, i) => (
                  <AnomalyBadge key={i} anomaly={anomaly} />
                ))}
              </div>
            )}
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-text-muted" />
            ) : (
              <ChevronDown className="w-4 h-4 text-text-muted" />
            )}
          </div>
        </div>

        {/* Mobile vitals row */}
        <div className="flex md:hidden items-center gap-4 mt-3 text-xs text-text-muted flex-wrap">
          {(session.preWeight != null || session.postWeight != null) && (
            <div className="flex items-center gap-1.5">
              <Weight className="w-3.5 h-3.5 text-brand" />
              <span>{session.preWeight ?? '—'} → {session.postWeight ?? '—'} kg</span>
            </div>
          )}
          {session.sessionDurationMinutes != null && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-warning" />
              <span>{session.sessionDurationMinutes}/{session.targetDurationMinutes} min</span>
            </div>
          )}
        </div>

        {/* Expanded section */}
        {expanded && (
          <div className="mt-4 pt-3 border-t border-border-custom space-y-3">
            {/* Anomaly details */}
            {session.anomalies.length > 0 && (
              <div className="space-y-1.5">
                {session.anomalies.map((anomaly, i) => (
                  <p
                    key={i}
                    className={`text-xs ${
                      anomaly.severity === 'critical' ? 'text-critical' : 'text-warning'
                    }`}
                  >
                    ⚠ {anomaly.message}
                  </p>
                ))}
              </div>
            )}

            {/* Nurse notes — inline editor */}
            <NotesEditor
              sessionId={session._id}
              initialNotes={currentNotes}
              onNotesSaved={setCurrentNotes}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
