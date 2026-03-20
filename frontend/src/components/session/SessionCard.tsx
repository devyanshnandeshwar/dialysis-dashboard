import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/components/ui/StatusBadge';
import NotesEditor from '@/components/session/NotesEditor';
import EditPatientModal from '@/components/patient/EditPatientModal';
import { Weight, HeartPulse, Clock, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import type { DialysisSession, Patient } from '@/types';

function getBorderColor(session: DialysisSession): string {
  const hasCritical = session.anomalies.some((a) => a.severity === 'critical');
  const hasWarning = session.anomalies.some((a) => a.severity === 'warning');

  if (hasCritical) return 'border-l-critical';
  if (hasWarning) return 'border-l-warning';
  if (session.status === 'completed' && session.anomalies.length === 0) return 'border-l-success';
  return 'border-l-border-custom';
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
}

export default function SessionCard({ 
  session, 
  sequenceNumber,
  isFirst, 
  isLast, 
  isMoving,
  onMoveUp, 
  onMoveDown,
  onPatientUpdated
}: SessionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [currentNotes, setCurrentNotes] = useState(session.nurseNotes || '');
  const patient = session.patientId as Patient;

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

  return (
    <Card
      ref={cardRef}
      className={`group bg-surface border-border-custom border-l-4 ${getBorderColor(session)} transition-colors hover:bg-surface-alt/50 ${isMoving ? 'opacity-60 ring-2 ring-brand ring-offset-2' : ''}`}
    >
      <CardContent className="p-0">
        <div className="flex w-full items-stretch min-h-[96px]">
          
          {/* Queue Left Fixed Section */}
          <div className="w-16 flex flex-col items-center justify-center border-r border-border-custom bg-surface-alt/30 py-2 shrink-0">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 text-text-muted hover:text-brand"
              disabled={isFirst || isMoving}
              onClick={() => onMoveUp && onMoveUp(session._id)}
            >
              <ChevronUp className="w-4 h-4" />
            </Button>
            
            <div className="text-text-muted font-bold text-xl my-1 w-full text-center tabular-nums">
              {isMoving ? <Loader2 className="w-4 h-4 animate-spin mx-auto text-brand" /> : sequenceNumber}
            </div>
            
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 text-text-muted hover:text-brand"
              disabled={isLast || isMoving}
              onClick={() => onMoveDown && onMoveDown(session._id)}
            >
              <ChevronDown className="w-4 h-4" />
            </Button>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col justify-center p-4 min-w-0">
            {/* Row 1: Name + Status */}
            <div className="flex items-center gap-3">
              <h3 className="text-base font-bold text-text-primary truncate">
                {patient.name}
              </h3>
              <StatusBadge status={session.status} />
              {session.machineId && (
                <span className="text-xs text-text-muted font-medium bg-surface-alt px-2 py-0.5 rounded ml-auto">
                  {session.machineId}
                </span>
              )}
            </div>
            
            {/* Row 2: MRN + Reg Time */}
            <div className="flex items-center gap-2 mt-1.5 text-xs text-text-muted">
              <span className="font-mono bg-surface-alt/50 px-1.5 py-0.5 rounded">
                {patient.mrn}
              </span>
              <span>•</span>
              <span>Registered {formatTime(session.createdAt)}</span>
            </div>
          </div>

          {/* Vitals Fixed Columns */}
          <div className="hidden lg:flex shrink-0 items-center justify-center gap-6 px-6 border-l border-border-custom/50">
            
            {/* Weight Col */}
            <div className="flex flex-col gap-1.5 w-24">
              <div className="flex items-center gap-1.5 text-xs text-text-muted font-medium">
                <Weight className="w-3.5 h-3.5 text-brand" /> Weight (kg)
              </div>
              <div className="text-sm font-semibold text-text-primary">
                {isNotStarted ? '—' : `${session.preWeight ?? '—'} → ${session.postWeight ?? '—'}`}
              </div>
            </div>

            {/* BP Col */}
            <div className="flex flex-col gap-1.5 w-32 border-l border-border-custom/50 pl-6">
              <div className="flex items-center gap-1.5 text-xs text-text-muted font-medium">
                <HeartPulse className="w-3.5 h-3.5 text-critical" /> BP (mmHg)
              </div>
              <div className="text-sm font-semibold text-text-primary">
                {isNotStarted ? '—' : `${session.preBloodPressure ? `${session.preBloodPressure.systolic}/${session.preBloodPressure.diastolic}` : '—'} → ${session.postBloodPressure ? `${session.postBloodPressure.systolic}/${session.postBloodPressure.diastolic}` : '—'}`}
              </div>
            </div>

            {/* Duration Col */}
            <div className="flex flex-col gap-1.5 w-24 border-l border-border-custom/50 pl-6">
              <div className="flex items-center gap-1.5 text-xs text-text-muted font-medium">
                <Clock className="w-3.5 h-3.5 text-warning" /> Duration
              </div>
              <div className="text-sm font-semibold text-text-primary">
                {isNotStarted ? '—' : `${session.sessionDurationMinutes ?? '—'} / ${session.targetDurationMinutes}m`}
              </div>
            </div>

          </div>

          {/* Anomalies Stack */}
          <div className="hidden xl:flex shrink-0 w-44 items-center justify-end px-4 flex-col gap-1.5 border-l border-border-custom/50">
            {session.anomalies.length > 0 ? (
              session.anomalies.map((anom, i) => (
                <div key={i} className={`text-[11px] font-bold px-2 py-0.5 rounded border whitespace-nowrap w-full text-center truncate ${anom.severity === 'critical' ? 'bg-critical/10 text-critical border-critical/30' : 'bg-warning/10 text-warning border-warning/30'}`} title={anom.message}>
                  {anom.type.replace('_', ' ').toUpperCase()}
                </div>
              ))
            ) : (
              <div className="text-xs text-text-muted/50 italic text-center w-full">No anomalies</div>
            )}
          </div>

          {/* Right Action Icons */}
          <div className="shrink-0 flex flex-col justify-between items-center px-3 py-3 border-l border-border-custom/50 bg-surface-alt/10">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              {onPatientUpdated && (
                <EditPatientModal 
                  patient={patient} 
                  onPatientUpdated={(updated) => onPatientUpdated(patient._id, updated)} 
                />
              )}
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 text-text-muted hover:text-text-primary hover:bg-surface-alt"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Expanded section */}
        {expanded && (
          <div className="p-4 border-t border-border-custom space-y-3 bg-surface-alt/10">
            {/* Mobile/Tablet fallback for vitals/anomalies */}
            <div className="flex xl:hidden flex-wrap gap-4 text-xs">
              {session.anomalies.map((anom, i) => (
                <span key={i} className={`font-medium ${anom.severity === 'critical' ? 'text-critical' : 'text-warning'}`}>
                  ⚠ {anom.message}
                </span>
              ))}
            </div>

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
