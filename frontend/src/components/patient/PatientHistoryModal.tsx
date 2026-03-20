import { useState, useEffect } from 'react';
import { getPaginatedSessions } from '@/api/sessions';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, History, Weight, HeartPulse, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';
import NotesEditor from '@/components/session/NotesEditor';
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
    <div className="bg-surface border border-border-custom rounded-lg overflow-hidden mb-3">
      <div className="p-4 flex items-center gap-4 flex-wrap sm:flex-nowrap">
        {/* Date & Status */}
        <div className="min-w-[120px] shrink-0">
          <div className="font-medium text-text-primary text-sm">{formatTime(session.scheduledDate)}</div>
          <div className="mt-1"><StatusBadge status={session.status} /></div>
        </div>

        {/* Vitals */}
        <div className="flex-1 flex gap-4 xl:gap-6 min-w-[200px]">
          <div className="flex flex-col gap-1 w-20">
            <div className="flex items-center gap-1 text-[11px] text-text-muted font-medium">
              <Weight className="w-3 h-3 text-brand" /> Weight
            </div>
            <div className="text-xs font-semibold text-text-primary">
              {isNotStarted ? '—' : `${session.preWeight ?? '-'} → ${session.postWeight ?? '-'}`}
            </div>
          </div>
          <div className="flex flex-col gap-1 w-24">
            <div className="flex items-center gap-1 text-[11px] text-text-muted font-medium">
              <HeartPulse className="w-3 h-3 text-critical" /> BP
            </div>
            <div className="text-xs font-semibold text-text-primary">
              {isNotStarted ? '—' : `${session.preBloodPressure ? `${session.preBloodPressure.systolic}/${session.preBloodPressure.diastolic}` : '-'} → ${session.postBloodPressure ? `${session.postBloodPressure.systolic}/${session.postBloodPressure.diastolic}` : '-'}`}
            </div>
          </div>
          <div className="flex flex-col gap-1 w-16">
            <div className="flex items-center gap-1 text-[11px] text-text-muted font-medium">
              <Clock className="w-3 h-3 text-warning" /> Dur.
            </div>
            <div className="text-xs font-semibold text-text-primary">
              {isNotStarted ? '—' : `${session.sessionDurationMinutes ?? '-'}m`}
            </div>
          </div>
        </div>

        {/* Anomalies & Expansion */}
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          {session.anomalies.length > 0 && (
            <div className="flex gap-1 flex-wrap w-24 justify-end">
              {session.anomalies.map((anom, i) => (
                <div key={i} className={`text-[9px] font-bold px-1.5 py-0.5 rounded border whitespace-nowrap ${anom.severity === 'critical' ? 'bg-critical/10 text-critical border-critical/30' : 'bg-warning/10 text-warning border-warning/30'}`} title={anom.message}>
                  {anom.type.replace('_', ' ').toUpperCase()}
                </div>
              ))}
            </div>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 text-text-muted hover:text-text-primary hover:bg-surface-alt ml-2"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="p-4 border-t border-border-custom space-y-3 bg-surface-alt/10">
           <NotesEditor
             sessionId={session._id}
             initialNotes={session.nurseNotes || ''}
             onNotesSaved={() => {}}
           />
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

  const fetchHistory = async (pageNumber: number, append = false) => {
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
  };

  useEffect(() => {
    if (open) {
      setPage(1);
      fetchHistory(1);
    }
  }, [open]);

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
          className="h-7 px-2 text-text-muted hover:text-brand hover:bg-surface-alt transition-colors"
        >
          <History className="w-3.5 h-3.5 mr-1" /> History
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-3xl bg-surface border-border-custom text-text-primary p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-border-custom bg-surface-alt/10">
          <DialogTitle className="text-text-primary flex items-end gap-3">
            {patient.name}
            <span className="text-xs font-normal text-text-muted mb-0.5">MRN: {patient.mrn}</span>
            <span className="text-xs font-normal text-text-muted mb-0.5">Dry Weight: {patient.dryWeight}kg</span>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[60vh] px-6 py-4">
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
              <Loader2 className="w-5 h-5 text-brand animate-spin opacity-50" />
            </div>
          )}

          {!loading && page < totalPages && (
            <div className="flex justify-center mt-4 pb-4">
              <Button variant="outline" size="sm" onClick={handleLoadMore}>
                Load More ({totalSessions - sessions.length} remaining)
              </Button>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
