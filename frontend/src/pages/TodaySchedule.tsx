import { useState, useCallback } from 'react';
import { useTodaySessions } from '@/hooks/useTodaySessions';
import SessionCard from '@/components/session/SessionCard';
import AddSessionModal from '@/components/session/AddSessionModal';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarDays, CalendarOff, AlertTriangle } from 'lucide-react';

type FilterCategory = 'all' | 'anomalies' | 'upcoming' | 'in_progress' | 'completed';

const HEADER_OFFSET_CLASS = 'top-0';
const SKELETON_CARD_COUNT = 3;
const TODAY_DATE_FORMAT: Intl.DateTimeFormatOptions = {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
};

const FILTER_LABELS: Record<FilterCategory, string> = {
  all: 'All',
  in_progress: 'In Progress',
  upcoming: 'Upcoming',
  completed: 'Completed',
  anomalies: 'Anomalies',
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

  // Reorder indices are computed against the rendered list, so they only line up
  // with the real queue when nothing is filtered out.
  const canReorder = filter === 'all';

  const handleMoveUp = useCallback(async (id: string, index: number) => {
    if (!canReorder || index === 0) return;
    await reorderSession(id, 'up', index, index - 1);
  }, [canReorder, reorderSession]);

  const handleMoveDown = useCallback(async (id: string, index: number) => {
    if (!canReorder || index === sessions.length - 1) return;
    await reorderSession(id, 'down', index, index + 1);
  }, [canReorder, reorderSession, sessions.length]);

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

  // One row instead of two: the counts and the filter controls were previously
  // separate rows expressing the same taxonomy.
  const filterChips: { key: FilterCategory; count: number; alert?: boolean }[] = [
    { key: 'all', count: summary.total },
    { key: 'in_progress', count: summary.inProgress },
    { key: 'upcoming', count: summary.notStarted },
    { key: 'completed', count: summary.completed },
    { key: 'anomalies', count: summary.withAnomalies, alert: true },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-4 pb-10">
      <div className={`glass sticky ${HEADER_OFFSET_CLASS} z-20 rounded-xl px-4 py-3 mb-4 space-y-3`}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-accent-fg" />
              Today's Schedule
            </h1>
            <p className="text-sm text-text-secondary mt-0.5">
              {today}
            </p>
          </div>
          <AddSessionModal onSessionCreated={fetchSessions} />
        </div>

        {/* Counts double as filters */}
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter sessions">
          {filterChips.map(({ key, count, alert }) => {
            const isActive = filter === key;
            const isAlerting = Boolean(alert) && count > 0;

            const tone = isActive
              ? 'bg-accent-solid border-accent-solid text-accent-on-solid hover:brightness-90'
              : isAlerting
                ? 'bg-critical-solid border-critical-solid text-critical-on-solid'
                : 'bg-surface-alt border-border text-text-secondary hover:bg-surface-hover hover:text-text-primary';

            return (
              <Button
                key={key}
                variant="ghost"
                size="sm"
                aria-pressed={isActive}
                onClick={() => setFilter(key)}
                className={`rounded-full h-auto px-3 py-1 border transition-colors gap-1.5 ${tone}`}
              >
                {isAlerting && <AlertTriangle className="w-3.5 h-3.5" />}
                <span className="text-[11px] font-semibold tracking-wide uppercase">
                  {FILTER_LABELS[key]}
                </span>
                <span className="text-sm font-semibold tabular-nums">{count}</span>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Session list */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: SKELETON_CARD_COUNT }, (_, i) => (
            <div key={i} className="surface-panel rounded-xl px-4 py-2.5 space-y-2">
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
          <CalendarOff className="w-10 h-10 text-text-muted mx-auto opacity-40" />
          <p className="text-text-muted text-sm">
            {filter === 'all'
              ? 'No sessions scheduled for today.'
              : `No ${FILTER_LABELS[filter].toLowerCase()} sessions today.`}
          </p>
          {filter !== 'all' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilter('all')}
              className="rounded-full px-4 border border-border text-text-secondary hover:bg-surface-hover hover:text-text-primary"
            >
              Show all sessions
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2 flex flex-col relative w-full">
          {filtered.map((session, index) => (
            <SessionCard
              key={session._id}
              session={session}
              sequenceNumber={index + 1}
              isFirst={index === 0}
              isLast={index === filtered.length - 1}
              isMoving={movingSessionId === session._id}
              canReorder={canReorder}
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
