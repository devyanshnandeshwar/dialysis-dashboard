import { useState, useEffect, useCallback } from 'react';
import { getPaginatedSessions } from '@/api/sessions';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, History, Weight, HeartPulse, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';
import type { Patient, DialysisSession } from '@/types';

interface PatientHistoryModalProps {
  patient: Patient;
}

function SessionHistoryRow({ session }: { session: DialysisSession }) {
  const [expanded, setExpanded] = useState(false);
  const isNotStarted = session.status === 'not_started';

  const formatTime = (isoString?: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden mb-4 shadow-sm transition-shadow hover:shadow-md">
      {/* Vitals Grid Row */}
      <div className="p-4 grid grid-cols-[140px_1fr_1fr_1fr_40px] gap-6 items-center">
        {/* Col 1: Date & Status */}
        <div className="flex flex-col gap-1.5">
          <div className="font-semibold text-text-primary text-sm">{formatTime(session.scheduledDate)}</div>
          <div><StatusBadge status={session.status} /></div>
        </div>

        {/* Col 2: Weight */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest text-text-muted">
            <Weight className="w-3.5 h-3.5 opacity-80" /> WEIGHT
          </div>
          <div className="text-sm font-medium text-text-primary">
            {isNotStarted ? '—' : `${session.preWeight ?? '-'} → ${session.postWeight ?? '-'}`}
          </div>
        </div>

        {/* Col 3: BP */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest text-text-muted">
            <HeartPulse className="w-3.5 h-3.5 opacity-80" /> BP
          </div>
          <div className="text-sm font-medium text-text-primary">
            {isNotStarted ? '—' : `${session.preBloodPressure ? `${session.preBloodPressure.systolic}/${session.preBloodPressure.diastolic}` : '-'} → ${session.postBloodPressure ? `${session.postBloodPressure.systolic}/${session.postBloodPressure.diastolic}` : '-'}`}
          </div>
        </div>

        {/* Col 4: Duration */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest text-text-muted">
            <Clock className="w-3.5 h-3.5 opacity-80" /> DURATION
          </div>
          <div className="text-sm font-medium text-text-primary">
            {isNotStarted ? '—' : `${session.sessionDurationMinutes ?? '-'}m`}
          </div>
        </div>

        {/* Col 5: Expansion Toggle */}
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Expand session details"
            onClick={() => setExpanded(!expanded)}
            className="text-text-muted hover:text-accent hover:bg-surface-hover w-8 h-8 shrink-0 rounded-md"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Anomalies Row */}
      <div className="px-4 pb-4">
        {session.anomalies.length > 0 ? (
          <div className="flex gap-2 flex-wrap">
            {session.anomalies.map((anom, i) => (
              <div key={i} className={`text-[10px] tracking-wide font-bold px-2 py-0.5 rounded-full border ${anom.severity === 'critical' ? 'bg-critical-bg text-text-primary border-[rgba(240,79,79,0.3)]' : 'bg-warning-bg text-text-primary border-[rgba(240,165,0,0.3)]'}`} title={anom.message}>
                {anom.type.replace(/_/g, ' ')}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-text-muted italic opacity-60 flex items-center h-6">
            No anomalies recorded.
          </div>
        )}
      </div>

      {/* Expanded Nurse Notes */}
      {expanded && (
        <div className="p-4 border-t border-border-subtle bg-surface-alt rounded-b-xl shadow-inner">
          <div className="text-sm text-text-primary">
            {session.nurseNotes ? (
              <p className="whitespace-pre-wrap leading-relaxed">{session.nurseNotes}</p>
            ) : (
              <span className="text-text-muted italic opacity-60">No notes recorded</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PatientHistoryModal({ patient }: PatientHistoryModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState<DialysisSession[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalSessions, setTotalSessions] = useState(0);

  const fetchHistory = useCallback(async (pageNumber: number, append = false) => {
    try {
      setLoading(true);
      const data = await getPaginatedSessions({ patientId: patient._id, page: pageNumber, limit: 5 });
      setSessions(prev => append ? [...prev, ...data.sessions] : data.sessions);
      setTotalPages(data.totalPages);
      setTotalSessions(data.total);
    } catch {
      // Quiet fail
    } finally {
      setLoading(false);
    }
  }, [patient._id]);

  useEffect(() => {
    if (open) {
      setPage(1);
      fetchHistory(1);
    }
  }, [open, fetchHistory]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchHistory(nextPage, true);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 px-3 text-text-muted hover:text-accent hover:bg-surface-hover border border-transparent hover:border-border transition-all"
        >
          <History className="w-3.5 h-3.5 mr-1" /> History
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-3xl w-full min-h-0 bg-surface border-border shadow-2xl text-text-primary p-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-6 py-4 border-b border-border-subtle bg-surface-alt/40 shrink-0">
          <DialogTitle className="text-text-primary flex items-end gap-3 text-lg font-bold">
            {patient.name}
            <span className="text-xs font-medium tracking-wide text-text-muted mb-0.5 ml-2 font-mono">MRN: {patient.mrn}</span>
            <span className="text-xs font-medium tracking-wide text-text-muted mb-0.5 ml-1 uppercase">Dry: {patient.dryWeight}kg</span>
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[70vh] px-6 py-4">
          {sessions.length === 0 && !loading ? (
            <div className="text-center py-12 text-text-muted text-sm italic">
              No sessions recorded yet.
            </div>
          ) : (
            <div className="space-y-1">
              {sessions.map(s => <SessionHistoryRow key={s._id} session={s} />)}
            </div>
          )}

          {loading && (
            <div className="flex justify-center py-4">
              <Loader2 className="w-6 h-6 text-accent animate-spin opacity-50" />
            </div>
          )}

          {!loading && page < totalPages && (
            <div className="flex justify-center mt-6 pb-4">
              <Button variant="outline" size="sm" onClick={handleLoadMore} className="bg-surface border-border hover:bg-surface-hover hover:text-text-primary text-text-muted text-xs h-8 px-4 rounded-full shadow-sm">
                Load More ({totalSessions - sessions.length} remaining)
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
