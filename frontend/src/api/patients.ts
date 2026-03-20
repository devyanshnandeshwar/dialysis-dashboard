import client from './client';
import type { Patient, DialysisSession } from '@/types';

export interface PatientWithSessions extends Patient {
  recentSessions: DialysisSession[];
}

export const getPatients = async (): Promise<Patient[]> => {
  const { data } = await client.get<Patient[]>('/patients');
  return data;
};

export const getPatientById = async (id: string): Promise<PatientWithSessions> => {
  const { data } = await client.get<PatientWithSessions>(`/patients/${id}`);
  return data;
};

export const createPatient = async (
  patient: Omit<Patient, '_id' | 'createdAt' | 'updatedAt'>
): Promise<Patient> => {
  const { data } = await client.post<Patient>('/patients', patient);
  return data;
};

export const updatePatient = async (
  id: string,
  patient: Partial<Omit<Patient, '_id' | 'mrn' | 'createdAt' | 'updatedAt'>>
): Promise<Patient> => {
  const { data } = await client.patch<Patient>(`/patients/${id}`, patient);
  return data;
};
