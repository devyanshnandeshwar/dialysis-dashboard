import { useState, useCallback } from 'react';
import { useTodaySessions } from '@/hooks/useTodaySessions';
import SessionCard from '@/components/session/SessionCard';
import AddSessionModal from '@/components/session/AddSessionModal';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarDays, AlertTriangle, Loader2 } from 'lucide-react';

type FilterCategory = 'all' | 'anomalies' | 'upcoming' | 'in_progress' | 'completed';

const HEADER_OFFSET_CLASS = 'top-0';
const SKELETON_CARD_COUNT = 3;
const TODAY_DATE_FORMAT: Intl.DateTimeFormatOptions = {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
};

export default function TodaySchedule() {
  const { 
    sessions, 
    summary, 
    loading, 
    movingSessionId, 
    fetchSessions, 
    reorderSession, 
    updatePatientInSession 
  } = useTodaySessions();

  const [filter, setFilter] = useState<FilterCategory>('all');

  const handleMoveUp = useCallback(async (id: string, index: number) => {
    if (index === 0) return;
    await reorderSession(id, 'up', index, index - 1);
  }, [reorderSession]);

  const handleMoveDown = useCallback(async (id: string, index: number) => {
    if (index === sessions.length - 1) return;
    await reorderSession(id, 'down', index, index + 1);
  }, [reorderSession, sessions.length]);

  const filtered = sessions.filter((s) => {
    if (filter === 'all') return true;
    if (filter === 'anomalies') return s.anomalies.length > 0;
    if (filter === 'upcoming') return s.status === 'not_started';
    if (filter === 'in_progress') return s.status === 'in_progress';
    return s.status === 'completed';
  });

  const today = new Date().toLocaleDateString('en-US', {
    ...TODAY_DATE_FORMAT,
  });

  const anomalyCount = summary.withAnomalies;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-10">
      <div className={`sticky ${HEADER_OFFSET_CLASS} z-20 -mx-6 px-6 -mt-6 pt-6 pb-5 mb-6 backdrop-blur-md bg-bg/85 border-b border-border-subtle shadow-[0_4px_24px_rgba(0,0,0,0.04)] space-y-5`}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2.5">
              <CalendarDays className="w-6 h-6 text-accent" />
              Today's Schedule
            </h1>
            <p className="text-sm font-medium text-text-secondary mt-1">
              {today}
            </p>
          </div>
          <AddSessionModal onSessionCreated={fetchSessions} />
        </div>

        {/* Stats Row */}
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-alt/60 border border-border-subtle text-xs font-medium text-text-primary shadow-xs">
            <span className="text-text-muted font-semibold tracking-wide uppercase text-[10px]">In Progress:</span> {summary.inProgress}
          </div>
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-alt/60 border border-border-subtle text-xs font-medium text-text-primary shadow-xs">
            <span className="text-text-muted font-semibold tracking-wide uppercase text-[10px]">Upcoming:</span> {summary.notStarted}
          </div>
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-alt/60 border border-border-subtle text-xs font-medium text-text-primary shadow-xs">
            <span className="text-text-muted font-semibold tracking-wide uppercase text-[10px]">Completed:</span> {summary.completed}
          </div>
          <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full shadow-xs text-xs font-medium ${anomalyCount > 0
            ? 'bg-critical/15 border border-critical/30 text-text-primary'
            : 'bg-surface-alt/60 border border-border-subtle text-text-primary'
            }`}>
            {anomalyCount > 0 && <AlertTriangle className="w-3.5 h-3.5" />}
            <span className={anomalyCount > 0 ? 'text-[10px] font-semibold tracking-wide uppercase' : 'text-text-muted font-semibold tracking-wide uppercase text-[10px]'}>Anomalies:</span> {anomalyCount}
          </div>
        </div>

        {/* Filter toggles */}
        <div className="flex gap-2">
          {([
            { key: 'all', label: 'All' },
            { key: 'anomalies', label: 'Anomalies' },
            { key: 'upcoming', label: 'Upcoming' },
            { key: 'in_progress', label: 'In Progress' },
            { key: 'completed', label: 'Completed' },
          ] as const).map(({ key, label }) => (
            <Button
              key={key}
              variant="ghost"
              size="sm"
              onClick={() => setFilter(key)}
              className={`rounded-full px-4 border transition-all ${filter === key
                ? 'bg-accent/25 border-accent/70 text-text-primary hover:bg-accent/30 hover:text-text-primary'
                : 'bg-transparent border-border text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                }`}
            >
              {key === 'anomalies' && <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />}
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* Session list */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: SKELETON_CARD_COUNT }, (_, i) => (
            <div key={i} className="bg-surface border border-border rounded-lg p-4 space-y-3">
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
        <div className="space-y-4 flex flex-col relative w-full">
          {filtered.map((session, index) => (
            <SessionCard
              key={session._id}
              session={session}
              sequenceNumber={index + 1}
              isFirst={index === 0}
              isLast={index === filtered.length - 1}
              isMoving={movingSessionId === session._id}
              onMoveUp={() => handleMoveUp(session._id, index)}
              onMoveDown={() => handleMoveDown(session._id, index)}
              onPatientUpdated={updatePatientInSession}
              onSessionUpdated={fetchSessions}
            />
          ))}
        </div>
      )}
    </div>
  );
}
