import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/components/ui/StatusBadge';
import AnomalyBadge from '@/components/ui/AnomalyBadge';
import NotesEditor from '@/components/session/NotesEditor';
import CompleteSessionModal from '@/components/session/CompleteSessionModal';
import EditPatientModal from '@/components/patient/EditPatientModal';
import { Weight, HeartPulse, Clock, ChevronDown, ChevronUp, Loader2, Cpu } from 'lucide-react';
import { startSession } from '@/api/sessions';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import type { DialysisSession, Patient } from '@/types';

/**
 * Status rail colour. `in_progress` used to fall through to the neutral border,
 * which left the one patient actually on a machine as the least salient row on
 * the screen. It now gets its own cyan, distinct from the severity hues and
 * from the monochrome used for every control.
 */
function getRailColor(session: DialysisSession): string {
  const hasCritical = session.anomalies.some((a) => a.severity === 'critical');
  const hasWarning = session.anomalies.some((a) => a.severity === 'warning');

  if (hasCritical) return 'bg-critical-solid';
  if (hasWarning) return 'bg-warning-solid';
  if (session.status === 'in_progress') return 'bg-active-solid';
  if (session.status === 'completed') return 'bg-success-solid';
  return 'bg-border';
}

interface StatProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  /** Fixed track width so the three stats line up row to row. Safe here in a
      way the old markup was not: the parent wraps rather than overflowing. */
  width: string;
  children: React.ReactNode;
}

function Stat({ icon: Icon, label, width, children }: StatProps) {
  return (
    <div className={`min-w-0 ${width}`}>
      <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
        <Icon className="w-3 h-3 shrink-0" aria-hidden="true" />
        {label}
      </div>
      <div className="mt-0.5 text-sm font-medium text-text-primary tabular-nums truncate">
        {children}
      </div>
    </div>
  );
}

/** `72.4` -> `72.4 kg`, missing -> `--`. Units were absent everywhere before. */
function weight(value?: number | null) {
  return value == null ? '--' : `${value} kg`;
}

function bp(reading?: { systolic: number; diastolic: number } | null) {
  return reading ? `${reading.systolic}/${reading.diastolic}` : '--';
}

interface SessionCardProps {
  session: DialysisSession;
  sequenceNumber: number;
  isFirst?: boolean;
  isLast?: boolean;
  isMoving?: boolean;
  /** False while the list is filtered, where positions shown are not queue positions. */
  canReorder?: boolean;
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
  canReorder = true,
  onMoveUp,
  onMoveDown,
  onPatientUpdated,
  onSessionUpdated,
}: SessionCardProps) {
  const { can } = useAuth();

  // Reordering needs both: the list must be unfiltered (so the positions shown
  // are the real queue positions) and the role must be allowed to change it.
  const mayReorderByRole = can('session:reorder');
  const mayReorder = canReorder && mayReorderByRole;
  const reorderBlockedTitle = mayReorder
    ? undefined
    : mayReorderByRole
      ? 'Show all sessions to reorder the queue'
      : 'Your role cannot reorder the queue';
  const [expanded, setExpanded] = useState(false);
  const [currentNotes, setCurrentNotes] = useState(session.nurseNotes || '');
  const [starting, setStarting] = useState(false);

  const patient = typeof session.patientId === 'object' ? (session.patientId as Patient) : null;
  const patientName = patient?.name || 'Unknown Patient';
  const patientMrn = patient?.mrn || '--';

  const cardRef = useRef<HTMLDivElement>(null);
  const prevTopRef = useRef<number | null>(null);

  // FLIP the card to its new slot when the queue reorders.
  useEffect(() => {
    const rafId = requestAnimationFrame(() => {
      if (!cardRef.current) return;
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
    });

    return () => cancelAnimationFrame(rafId);
  }, [sequenceNumber]);

  const formatTime = (isoString?: string) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const isNotStarted = session.status === 'not_started';
  const isInProgress = session.status === 'in_progress';
  const isCompleted = session.status === 'completed';

  const handleStartSession = async () => {
    if (!session.machineId) {
      toast.error('Cannot start -- no machine assigned to this session');
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
    <div
      ref={cardRef}
      className={`surface-panel animate-row-in relative overflow-hidden rounded-xl transition-colors duration-200 hover:bg-surface-hover/40 ${
        isMoving ? 'opacity-70 queue-swap-flash' : ''
      }`}
      style={{ animationDelay: `${Math.min(sequenceNumber - 1, 8) * 40}ms` }}
    >
      {/* Status rail. A painted bar rather than a border-left so the radius
          stays clean and the color never affects layout width. */}
      <span
        className={`absolute inset-y-0 left-0 w-1 ${getRailColor(session)}`}
        aria-hidden="true"
      />

      {/* flex-wrap with min-w-0 on every flexible child is what keeps this from
          overflowing. The previous markup chained fixed widths that summed past
          the container below ~1450px and pushed the whole page sideways. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 py-2.5 pl-4 pr-3">
        {/* Queue position + reorder */}
        <div className="flex shrink-0 items-center gap-1">
          <span className="w-6 text-center text-base font-semibold tabular-nums text-text-secondary">
            {isMoving ? (
              <Loader2 className="mx-auto w-4 h-4 animate-spin text-text-primary" />
            ) : (
              sequenceNumber
            )}
          </span>
          <div className="flex flex-col">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Move up in queue"
              title={reorderBlockedTitle}
              className="h-5 w-5 rounded text-text-muted hover:text-text-primary hover:bg-surface-hover disabled:opacity-25"
              disabled={isFirst || isMoving || !mayReorder}
              onClick={() => onMoveUp?.(session._id)}
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Move down in queue"
              title={reorderBlockedTitle}
              className="h-5 w-5 rounded text-text-muted hover:text-text-primary hover:bg-surface-hover disabled:opacity-25"
              disabled={isLast || isMoving || !mayReorder}
              onClick={() => onMoveDown?.(session._id)}
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Identity. Fixed width rather than flex-1: when this column grew to
            fit differently-sized status badges it shifted the whole vitals
            group, so the three stat columns never lined up row to row. */}
        <div className="min-w-0 w-60 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <p className="truncate text-[15px] font-semibold text-text-primary">{patientName}</p>
            <StatusBadge status={session.status} />
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-text-muted">
            <span className="font-mono tracking-tight text-text-secondary">{patientMrn}</span>
            {session.machineId && (
              <span
                className={`inline-flex items-center gap-1 rounded border px-1.5 font-mono text-[10px] font-semibold ${
                  isInProgress
                    ? 'border-active-edge bg-active-tint text-active-fg'
                    : 'border-border bg-surface-alt text-text-secondary'
                }`}
              >
                <Cpu className="w-3 h-3" aria-hidden="true" />
                {session.machineId}
              </span>
            )}
            <span>Reg {formatTime(session.createdAt)}</span>
          </div>
        </div>

        {/* Vitals */}
        <div className="flex min-w-0 shrink-0 gap-x-5 gap-y-2">
          <Stat icon={Weight} label="Weight" width="w-32">
            {isNotStarted || session.postWeight == null
              ? weight(session.preWeight)
              : `${session.preWeight ?? '--'} → ${weight(session.postWeight)}`}
          </Stat>
          <Stat icon={HeartPulse} label="BP" width="w-32">
            {isNotStarted || !session.postBloodPressure
              ? bp(session.preBloodPressure)
              : `${bp(session.preBloodPressure)} → ${bp(session.postBloodPressure)}`}
          </Stat>
          <Stat icon={Clock} label="Duration" width="w-28">
            {isNotStarted
              ? `${session.targetDurationMinutes} min target`
              : `${session.sessionDurationMinutes ?? '--'}/${session.targetDurationMinutes} min`}
          </Stat>
        </div>

        {/* Anomalies. Values live on the badge now, not only in a tooltip. */}
        <div className="flex min-w-0 flex-1 basis-44 flex-wrap items-center gap-1.5">
          {session.anomalies.length > 0 ? (
            session.anomalies.map((anom, i) => <AnomalyBadge key={i} anomaly={anom} />)
          ) : (
            <span className="text-[11px] text-text-muted">No alerts</span>
          )}
        </div>

        {/* Actions */}
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          {isNotStarted && !can('session:start') && (
            <span className="text-[11px] font-medium text-text-muted">Awaiting start</span>
          )}

          {isNotStarted && can('session:start') && (
            <Button
              size="sm"
              onClick={handleStartSession}
              disabled={starting}
              className="h-8 bg-accent-solid text-accent-on-solid hover:brightness-90"
            >
              {starting ? (
                <>
                  <Loader2 className="mr-1.5 w-4 h-4 animate-spin" />
                  Starting
                </>
              ) : (
                'Start'
              )}
            </Button>
          )}

          {isInProgress && can('session:complete') && (
            <CompleteSessionModal session={session} onCompleted={() => onSessionUpdated?.()} />
          )}

          {isInProgress && !can('session:complete') && (
            <span className="text-[11px] font-medium text-active-fg">On machine</span>
          )}

          {isCompleted && (
            <span className="text-[11px] font-medium text-text-secondary tabular-nums">
              {formatTime(session.updatedAt)}
            </span>
          )}

          {onPatientUpdated && patient && can('patient:edit') && (
            <EditPatientModal
              patient={patient}
              onPatientUpdated={(updated) => onPatientUpdated(patient._id, updated)}
            />
          )}

          <Button
            variant="ghost"
            size="icon"
            aria-label={expanded ? 'Collapse session details' : 'Expand session details'}
            aria-expanded={expanded}
            className="h-8 w-8 rounded-md text-text-muted hover:text-text-primary hover:bg-surface-hover"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-border-subtle bg-surface-alt px-4 py-3 space-y-3">
          {session.anomalies.length > 0 && (
            <ul className="space-y-1">
              {session.anomalies.map((anom, i) => (
                <li
                  key={i}
                  className={`text-xs ${
                    anom.severity === 'critical' ? 'text-critical-fg' : 'text-warning-fg'
                  }`}
                >
                  {anom.message}
                </li>
              ))}
            </ul>
          )}

          <NotesEditor
            sessionId={session._id}
            initialNotes={currentNotes}
            readOnly={!can('session:notes')}
            onNotesSaved={async (newNotes) => {
              setCurrentNotes(newNotes);
              await onSessionUpdated?.();
            }}
          />
        </div>
      )}
    </div>
  );
});

export default SessionCard;
