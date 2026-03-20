import { useState, useEffect, useCallback } from 'react';
import { getTodaySessions, updateQueuePosition } from '@/api/sessions';
import SessionCard from '@/components/session/SessionCard';
import AddSessionModal from '@/components/session/AddSessionModal';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarDays, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { DialysisSession, Patient } from '@/types';

type Filter = 'all' | 'anomalies' | 'in_progress';

export default function TodaySchedule() {
  const [sessions, setSessions] = useState<DialysisSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [movingSessionId, setMovingSessionId] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getTodaySessions();
      // Keep only backend sorting, or fallback locally if needed:
      // data.sort((a, b) => (a.queuePosition || 0) - (b.queuePosition || 0));
      setSessions(data);
    } catch {
      toast.error('Failed to load today\'s sessions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleMoveUp = async (id: string, currentPos: number) => {
    if (currentPos <= 1) return;
    await handleReorder(id, currentPos - 1);
  };

  const handleMoveDown = async (id: string, currentPos: number) => {
    await handleReorder(id, currentPos + 1);
  };

  const handleReorder = async (id: string, newPos: number) => {
    try {
      setMovingSessionId(id);
      
      // Optimistic UI update
      setSessions(prev => {
        const cloned = [...prev];
        const targetIdx = cloned.findIndex(s => s._id === id);
        if (targetIdx === -1) return prev;
        
        const currentPos = cloned[targetIdx].queuePosition || 0;
        
        // Adjust others logically
        cloned.forEach(s => {
          if (!s.queuePosition || s._id === id) return;
          if (newPos < currentPos && s.queuePosition >= newPos && s.queuePosition < currentPos) {
            s.queuePosition += 1;
          } else if (newPos > currentPos && s.queuePosition > currentPos && s.queuePosition <= newPos) {
            s.queuePosition -= 1;
          }
        });
        
        cloned[targetIdx].queuePosition = newPos;
        return cloned.sort((a, b) => (a.queuePosition || 999) - (b.queuePosition || 999));
      });

      // API call
      const updatedSchedule = await updateQueuePosition(id, newPos);
      setSessions(updatedSchedule); // Sync with source of truth
    } catch {
      toast.error('Failed to reorder session');
      fetchSessions(); // Revert on failure
    } finally {
      setMovingSessionId(null);
    }
  };

  const handlePatientUpdated = (patientId: string, updatedPatient: Patient) => {
    setSessions(prev => prev.map(session => {
      if ((session.patientId as Patient)._id === patientId) {
        return { ...session, patientId: updatedPatient };
      }
      return session;
    }));
  };

  // Ensure sessions are sorted by queuePosition locally before filtering
  const sortedSessions = [...sessions].sort((a, b) => (a.queuePosition || 999) - (b.queuePosition || 999));

  const filtered = sortedSessions.filter((s) => {
    if (filter === 'anomalies') return s.anomalies.length > 0;
    if (filter === 'in_progress') return s.status === 'in_progress';
    return true;
  });

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const anomalyCount = sessions.filter((s) => s.anomalies.length > 0).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-brand" />
            Today's Schedule
          </h1>
          <p className="text-sm text-text-muted mt-1">
            {today} · {sessions.length} session{sessions.length !== 1 ? 's' : ''}
            {anomalyCount > 0 && (
              <span className="text-warning ml-2">
                · {anomalyCount} with anomalies
              </span>
            )}
          </p>
        </div>
        <AddSessionModal onSessionCreated={fetchSessions} />
      </div>

      {/* Filter toggles */}
      <div className="flex gap-2">
        {([
          { key: 'all', label: 'All' },
          { key: 'anomalies', label: 'Anomalies Only' },
          { key: 'in_progress', label: 'In Progress' },
        ] as const).map(({ key, label }) => (
          <Button
            key={key}
            variant={filter === key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(key)}
            className={
              filter === key
                ? 'bg-brand text-white hover:bg-brand/90'
                : 'border-border-custom text-text-muted hover:text-text-primary hover:bg-surface-alt'
            }
          >
            {key === 'anomalies' && <AlertTriangle className="w-3.5 h-3.5 mr-1" />}
            {label}
          </Button>
        ))}
      </div>

      {/* Session list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-surface border border-border-custom rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-32 bg-surface-alt" />
                <Skeleton className="h-5 w-20 rounded-full bg-surface-alt" />
              </div>
              <div className="flex gap-6">
                <Skeleton className="h-3 w-24 bg-surface-alt" />
                <Skeleton className="h-3 w-24 bg-surface-alt" />
                <Skeleton className="h-3 w-20 bg-surface-alt" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <Loader2 className="w-10 h-10 text-text-muted mx-auto opacity-40" />
          <p className="text-text-muted text-sm">
            {filter === 'all'
              ? 'No sessions scheduled for today.'
              : `No sessions matching "${filter.replace('_', ' ')}" filter.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((session, index) => (
            <SessionCard 
              key={session._id} 
              session={session} 
              isFirst={index === 0}
              isLast={index === filtered.length - 1}
              isMoving={movingSessionId === session._id}
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
              onPatientUpdated={handlePatientUpdated}
            />
          ))}
        </div>
      )}
    </div>
  );
}
