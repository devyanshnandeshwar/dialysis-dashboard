import client, { tokenStore } from './client';
import type { Permission, Role } from '@/lib/permissions';

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  role: Role;
  /** Resolved server-side from the role; the client never computes this. */
  permissions: Permission[];
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const { data } = await client.post<{ token: string; user: AuthUser }>('/auth/login', {
    email,
    password,
  });
  tokenStore.set(data.token);
  return data.user;
}

export async function fetchMe(): Promise<AuthUser> {
  const { data } = await client.get<{ user: AuthUser }>('/auth/me');
  return data.user;
}

export function logout() {
  tokenStore.clear();
}
