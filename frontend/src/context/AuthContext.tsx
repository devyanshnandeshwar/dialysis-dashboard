/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { fetchMe, login as apiLogin, logout as apiLogout } from '@/api/auth';
import type { AuthUser } from '@/api/auth';
import { setUnauthorizedHandler, tokenStore } from '@/api/client';
import { invalidatePatientsCache } from '@/api/patients';
import type { Permission } from '@/lib/permissions';

interface AuthContextValue {
  user: AuthUser | null;
  /** True until the stored token has been checked, so guards do not flash. */
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  /**
   * Whether the signed-in user holds a permission. Backed by the list the
   * server resolved from their role, so the UI and the API cannot disagree.
   * Hiding a control is a courtesy, not the enforcement -- every one of these
   * is also checked by requirePermission on the route.
   */
  can: (permission: Permission) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    apiLogout();
    // The patient list is cached at module scope, so without this the next
    // account to sign in on this tab would be served the previous one's data.
    invalidatePatientsCache();
    setUser(null);
  }, []);

  // Any 401 from anywhere in the app drops us back to signed-out state.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      invalidatePatientsCache();
      setUser(null);
    });
  }, []);

  // A token in storage is not proof of a live session -- it may have expired
  // while the tab was closed. Verify it against the server before rendering.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!tokenStore.get()) {
        setLoading(false);
        return;
      }

      try {
        const me = await fetchMe();
        if (!cancelled) setUser(me);
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    // Drop any list cached under the previous account before the new one reads it.
    invalidatePatientsCache();
    setUser(await apiLogin(email, password));
  }, []);

  const can = useCallback(
    (permission: Permission) => Boolean(user?.permissions?.includes(permission)),
    [user]
  );

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, can }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
