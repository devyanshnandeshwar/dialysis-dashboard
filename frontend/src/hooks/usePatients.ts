import { useState, useEffect, useCallback } from 'react';
import { getPatients } from '@/api/patients';
import type { Patient } from '@/types';
import { toast } from 'sonner';

export function usePatients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPatients = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getPatients();
      setPatients(data);
    } catch {
      toast.error('Failed to load patients');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  const updatePatient = useCallback((updated: Patient) => {
    setPatients(prev => prev.map(p => p._id === updated._id ? { ...p, ...updated } : p));
  }, []);

  const addPatient = useCallback((created: Patient) => {
    const newPatient = {
      ...created,
      totalSessions: 0,
      lastAnomalies: [],
      lastSession: null,
      todaySession: null,
    };
    setPatients(prev => [newPatient, ...prev]);
  }, []);

  return { patients, loading, fetchPatients, updatePatient, addPatient };
}
