import { useState, useEffect, useCallback } from 'react';
import { getTodaySessions } from '@/api/sessions';
import SessionCard from '@/components/session/SessionCard';
import AddSessionModal from '@/components/session/AddSessionModal';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarDays, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { DialysisSession } from '@/types';

type Filter = 'all' | 'anomalies' | 'in_progress';

export default function TodaySchedule() {
  const [sessions, setSessions] = useState<DialysisSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');

  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getTodaySessions();
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

  const filtered = sessions.filter((s) => {
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
          {filtered.map((session) => (
            <SessionCard key={session._id} session={session} />
          ))}
        </div>
      )}
    </div>
  );
}
