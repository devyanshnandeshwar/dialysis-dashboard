import client from './client';
import type { Patient, DialysisSession } from '@/types';

export interface PatientWithSessions extends Patient {
  recentSessions: DialysisSession[];
}

let patientsCache: Patient[] | null = null;

export const getPatients = async (options?: { force?: boolean }): Promise<Patient[]> => {
  if (!options?.force && patientsCache) {
    return patientsCache;
  }

  const { data } = await client.get<Patient[]>('/patients');
  patientsCache = data;
  return data;
};

export const invalidatePatientsCache = () => {
  patientsCache = null;
};

export const getPatientById = async (id: string): Promise<PatientWithSessions> => {
  const { data } = await client.get<PatientWithSessions>(`/patients/${id}`);
  return data;
};

export const createPatient = async (
  patient: Omit<Patient, '_id' | 'createdAt' | 'updatedAt'>
): Promise<Patient> => {
  const { data } = await client.post<Patient>('/patients', patient);
  invalidatePatientsCache();
  return data;
};

export const updatePatient = async (
  id: string,
  patient: Partial<Omit<Patient, '_id' | 'mrn' | 'createdAt' | 'updatedAt'>>
): Promise<Patient> => {
  const { data } = await client.patch<Patient>(`/patients/${id}`, patient);
  invalidatePatientsCache();
  return data;
};
