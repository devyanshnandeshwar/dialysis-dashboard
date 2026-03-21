import { useState, useEffect, useCallback } from 'react';
import { getTodaySessions, updateQueuePosition } from '@/api/sessions';
import type { DialysisSession, TodaySessionsSummary, Patient } from '@/types';
import { toast } from 'sonner';

export function useTodaySessions() {
  const emptySummary: TodaySessionsSummary = {
    total: 0,
    inProgress: 0,
    notStarted: 0,
    completed: 0,
    withAnomalies: 0,
  };

  const [sessions, setSessions] = useState<DialysisSession[]>([]);
  const [summary, setSummary] = useState<TodaySessionsSummary>(emptySummary);
  const [loading, setLoading] = useState(true);
  const [movingSessionId, setMovingSessionId] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getTodaySessions();
      setSessions(data.sessions);
      setSummary(data.summary);
    } catch {
      toast.error("Failed to load today's sessions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const reorderSession = useCallback(async (
    id: string,
    direction: 'up' | 'down',
    currentIndex: number,
    targetIndex: number
  ) => {
    try {
      setMovingSessionId(id);

      setSessions(prev => {
        const cloned = [...prev];
        const temp = cloned[currentIndex]!;
        cloned[currentIndex] = cloned[targetIndex]!;
        cloned[targetIndex] = temp;
        return cloned;
      });

      const updatedSchedule = await updateQueuePosition(id, direction);
      setSessions(updatedSchedule);
    } catch {
      toast.error('Failed to reorder session');
      fetchSessions();
    } finally {
      setMovingSessionId(null);
    }
  }, [fetchSessions]);

  const updatePatientInSession = useCallback((patientId: string, updatedPatient: Patient) => {
    setSessions(prev => prev.map(session => {
      if ((session.patientId as Patient)._id === patientId) {
        return { ...session, patientId: updatedPatient };
      }
      return session;
    }));
  }, []);

  return { 
    sessions, 
    summary, 
    loading, 
    movingSessionId, 
    fetchSessions, 
    reorderSession, 
    updatePatientInSession 
  };
}
