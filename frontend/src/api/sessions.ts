import client from './client';
import type { DialysisSession } from '@/types';

export const getTodaySessions = async (): Promise<DialysisSession[]> => {
  const { data } = await client.get<DialysisSession[]>('/sessions/today');
  return data;
};

export const getSessionById = async (id: string): Promise<DialysisSession> => {
  const { data } = await client.get<DialysisSession>(`/sessions/${id}`);
  return data;
};

export const createSession = async (
  session: Partial<DialysisSession>
): Promise<DialysisSession> => {
  const { data } = await client.post<DialysisSession>('/sessions', session);
  return data;
};

export const updateNurseNotes = async (
  id: string,
  nurseNotes: string
): Promise<DialysisSession> => {
  const { data } = await client.patch<DialysisSession>(`/sessions/${id}/notes`, {
    nurseNotes,
  });
  return data;
};
