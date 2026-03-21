import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/components/ui/StatusBadge';
import NotesEditor from '@/components/session/NotesEditor';
import CompleteSessionModal from '@/components/session/CompleteSessionModal';
import EditPatientModal from '@/components/patient/EditPatientModal';
import { Weight, HeartPulse, Clock, ChevronDown, ChevronUp, Loader2, AlertTriangle, Cpu } from 'lucide-react';
import { startSession } from '@/api/sessions';
import { toast } from 'sonner';
import type { DialysisSession, Patient } from '@/types';

function getBorderColor(session: DialysisSession): string {
  const hasCritical = session.anomalies.some((a) => a.severity === 'critical');
  const hasWarning = session.anomalies.some((a) => a.severity === 'warning');

  if (hasCritical) return 'border-l-critical';
  if (hasWarning) return 'border-l-warning';
  if (session.status === 'completed' && session.anomalies.length === 0) return 'border-l-success';
  return 'border-l-border';
}

interface VitalsDisplayProps {
  session: DialysisSession;
  isNotStarted: boolean;
}

function VitalsDisplay({ session, isNotStarted }: VitalsDisplayProps) {
  return (
    <div className="hidden lg:flex shrink-0 items-center px-6 border-l border-border-subtle">
      <div className="flex flex-col gap-1 w-32 text-center items-center">
        <div className="flex items-center justify-center gap-1.5 text-[10px] text-text-muted font-bold tracking-widest uppercase">
          <Weight className="w-3.5 h-3.5 text-text-muted opacity-80" /> WEIGHT
        </div>
        <div className="text-sm font-medium text-text-primary text-center">
          {isNotStarted ? '—' : (
            <span className="flex items-center justify-center gap-1">
              {session.preWeight ?? '—'} <span className="text-text-muted text-xs mx-0.5">→</span> {session.postWeight ?? '—'}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1 w-32 text-center items-center border-l border-border-subtle pl-4">
        <div className="flex items-center justify-center gap-1.5 text-[10px] text-text-muted font-bold tracking-widest uppercase">
          <HeartPulse className="w-3.5 h-3.5 text-text-muted opacity-80" /> BP
        </div>
        <div className="text-sm font-medium text-text-primary text-center">
          {isNotStarted ? '—' : (
            <span className="flex items-center justify-center gap-1">
              {session.preBloodPressure ? `${session.preBloodPressure.systolic}/${session.preBloodPressure.diastolic}` : '—'}
              <span className="text-text-muted text-xs mx-0.5">→</span>
              {session.postBloodPressure ? `${session.postBloodPressure.systolic}/${session.postBloodPressure.diastolic}` : '—'}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1 w-32 text-center items-center border-l border-border-subtle pl-4">
        <div className="flex items-center justify-center gap-1.5 text-[10px] text-text-muted font-bold tracking-widest uppercase">
          <Clock className="w-3.5 h-3.5 text-text-muted opacity-80" /> DURATION
        </div>
        <div className="text-sm font-medium text-text-primary text-center">
          {isNotStarted ? '—' : `${session.sessionDurationMinutes ?? '—'} / ${session.targetDurationMinutes}m`}
        </div>
      </div>
    </div>
  );
}

interface AnomalyBadgesProps {
  anomalies: DialysisSession['anomalies'];
}

function AnomalyBadges({ anomalies }: AnomalyBadgesProps) {
  return (
    <div className="hidden xl:flex shrink-0 w-48 items-center justify-center px-4 flex-col gap-2 border-l border-border-subtle">
      {anomalies.length > 0 ? (
        anomalies.map((anom, i) => (
          <div
            key={i}
            className={`flex items-center gap-1.5 text-[10px] tracking-wide font-bold px-2.5 py-1 rounded-full border whitespace-nowrap w-full text-left truncate ${anom.severity === 'critical' ? 'bg-critical-bg text-critical border-critical/40' : 'bg-warning-bg text-warning border-warning/40'}`}
            title={anom.message}
          >
            <AlertTriangle className="w-3 h-3 shrink-0" />
            <span className="truncate">{anom.type.replace(/_/g, ' ')}</span>
          </div>
        ))
      ) : (
        <div className="text-[11px] text-text-muted/40 uppercase tracking-widest font-semibold text-center w-full">NO ALERTS</div>
      )}
    </div>
  );
}

interface SessionCardProps {
  session: DialysisSession;
  sequenceNumber: number; // sequential 1, 2, 3...
  isFirst?: boolean;
  isLast?: boolean;
  isMoving?: boolean;
  onMoveUp?: (id: string) => void;
  onMoveDown?: (id: string) => void;
  onPatientUpdated?: (patientId: string, updatedPatient: Patient) => void;
  onSessionUpdated?: () => Promise<void> | void;
}

const SessionCard = React.memo(function SessionCard({
  session,
  sequenceNumber,
  isFirst,
  isLast,
  isMoving,
  onMoveUp,
  onMoveDown,
  onPatientUpdated,
  onSessionUpdated
}: SessionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [currentNotes, setCurrentNotes] = useState(session.nurseNotes || '');
  const [starting, setStarting] = useState(false);
  const patient =
    typeof session.patientId === 'object' ? (session.patientId as Patient) : null;
  const patientName = patient?.name || 'Unknown Patient';
  const patientMrn = patient?.mrn || '—';

  // Track previous position for flip animation
  const cardRef = useRef<HTMLDivElement>(null);
  const prevTopRef = useRef<number | null>(null);

  useEffect(() => {
    if (cardRef.current) {
      const top = cardRef.current.getBoundingClientRect().top;
      if (prevTopRef.current !== null && prevTopRef.current !== top) {
        const deltaY = prevTopRef.current - top;
        const el = cardRef.current;
        el.style.transform = `translateY(${deltaY}px)`;
        el.style.transition = 'transform 0s';

        requestAnimationFrame(() => {
          el.style.transform = 'translateY(0)';
          el.style.transition = 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1)';
        });
      }
      prevTopRef.current = top;
    }
  }, [sequenceNumber]); // Re-run when position changes

  const formatTime = (isoString?: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const isNotStarted = session.status === 'not_started';
  const isInProgress = session.status === 'in_progress';
  const isCompleted = session.status === 'completed';

  const handleStartSession = async () => {
    if (!session.machineId) {
      toast.error('Cannot start — no machine assigned to this session');
      return;
    }

    try {
      setStarting(true);
      await startSession(session._id);
      toast.success('Session moved to in progress');
      await onSessionUpdated?.();
    } catch {
      toast.error('Failed to start session');
    } finally {
      setStarting(false);
    }
  };

  return (
    <Card
      ref={cardRef}
      className={`group relative bg-surface border border-border rounded-xl border-l-[6px] ${getBorderColor(session)} transition-all hover:bg-surface-hover hover:border-border-subtle shadow-[0_1px_3px_rgba(0,0,0,0.4)] ${isMoving ? 'opacity-60 ring-2 ring-accent ring-offset-2 ring-offset-bg queue-swap-flash' : ''}`}
    >
      <CardContent className="p-0">
        {onPatientUpdated && (
          <div className="absolute right-2 top-2 z-20">
            {patient ? (
              <EditPatientModal
                patient={patient}
                onPatientUpdated={(updated) => onPatientUpdated(patient._id, updated)}
              />
            ) : null}
          </div>
        )}

        <div className="flex w-full items-center min-h-24 overflow-hidden">

          {/* Queue Left Fixed Section */}
          <div className="w-12 sm:w-16 flex flex-col items-center justify-center border-r border-border bg-surface-alt/10 py-2 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-text-muted hover:text-accent hover:bg-accent-glow disabled:opacity-20 disabled:hover:bg-transparent transition-colors rounded-md"
              disabled={isFirst || isMoving}
              onClick={() => onMoveUp && onMoveUp(session._id)}
            >
              <ChevronUp className="w-4 h-4" />
            </Button>

            <div className="text-text-muted font-bold text-2xl my-0.5 w-full text-center tabular-nums">
              {isMoving ? <Loader2 className="w-5 h-5 animate-spin mx-auto text-accent" /> : sequenceNumber}
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-text-muted hover:text-accent hover:bg-accent-glow disabled:opacity-20 disabled:hover:bg-transparent transition-colors rounded-md"
              disabled={isLast || isMoving}
              onClick={() => onMoveDown && onMoveDown(session._id)}
            >
              <ChevronDown className="w-4 h-4" />
            </Button>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col justify-center p-3 sm:p-4 min-w-0 pb-3 self-stretch">
            {/* Row 1: Name + Status */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 pr-1 flex-nowrap">
              <h3 className="flex-1 min-w-0 text-base font-semibold text-text-primary truncate">
                {patientName}
              </h3>
              <div className="shrink-0 whitespace-nowrap">
                <StatusBadge status={session.status} />
              </div>
              {session.machineId && !isCompleted && (
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-mono font-semibold px-2 py-0.5 rounded ml-auto shrink-0 border tracking-wide whitespace-nowrap ${isInProgress
                    ? 'bg-accent-glow text-accent border-border'
                    : 'bg-surface-alt text-text-secondary border-border-subtle'
                    }`}
                >
                  <Cpu className="w-3 h-3" />
                  {session.machineId}
                </span>
              )}
            </div>

            {/* Row 2: MRN + Reg Time */}
            <div className="flex items-center gap-2 mt-2 text-[11px] text-text-muted tracking-wide uppercase font-medium">
              <span className="text-text-secondary">
                {patientMrn}
              </span>
              <span className="text-border-subtle">•</span>
              <span>Reg {formatTime(session.createdAt)}</span>
            </div>
          </div>

          <VitalsDisplay session={session} isNotStarted={isNotStarted} />
          <AnomalyBadges anomalies={session.anomalies} />

          {/* Right Action Panel */}
          <div className="shrink-0 w-28 sm:w-auto flex flex-col justify-between items-center px-2 sm:px-4 py-3 border-l border-border-subtle bg-surface-alt/40 rounded-r-xl">
            <div className="min-h-8 w-full flex items-center justify-center">
              {isNotStarted && (
                <Button
                  size="sm"
                  onClick={handleStartSession}
                  disabled={starting}
                  className="bg-surface border border-border text-text-primary hover:bg-surface-hover px-2 sm:px-3"
                >
                  {starting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                      <span className="hidden sm:inline">Starting</span>
                    </>
                  ) : (
                    <>
                      <span className="hidden sm:inline">Start Session</span>
                      <span className="sm:hidden">Start</span>
                    </>
                  )}
                </Button>
              )}

              {isInProgress && (
                <CompleteSessionModal session={session} onCompleted={() => onSessionUpdated?.()} />
              )}

              {isCompleted && (
                <span className="text-[10px] sm:text-[11px] uppercase tracking-wide text-text-secondary font-semibold text-center">
                  <span className="hidden sm:inline">Completed {formatTime(session.updatedAt)}</span>
                  <span className="sm:hidden">Done {formatTime(session.updatedAt)}</span>
                </span>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-text-muted hover:text-accent hover:bg-surface rounded-md border border-transparent hover:border-border transition-all"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Expanded section */}
        <div className={`overflow-hidden transition-all duration-300 ease-out ${expanded ? 'max-h-105 opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="p-5 border-t border-border-subtle space-y-3 bg-surface-alt rounded-b-xl shadow-inner">
            {/* Mobile/Tablet fallback for vitals/anomalies */}
            <div className="flex xl:hidden flex-wrap gap-4 text-xs">
              {session.anomalies.map((anom, i) => (
                <span key={i} className={`font-semibold tracking-wide flex items-center gap-1 ${anom.severity === 'critical' ? 'text-critical' : 'text-warning'}`}>
                  <AlertTriangle className="w-3.5 h-3.5" /> {anom.message}
                </span>
              ))}
            </div>

            {/* Nurse notes — inline editor */}
            <NotesEditor
              sessionId={session._id}
              initialNotes={currentNotes}
              onNotesSaved={async (newNotes) => {
                setCurrentNotes(newNotes);
                await onSessionUpdated?.();
              }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

export default SessionCard;
