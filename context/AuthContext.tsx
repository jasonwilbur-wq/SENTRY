/**
 * AuthContext — manages user identity and auth posture for the SENTRY frontend.
 *
 * Flow on mount:
 *   1. Read VITE_SENTRY_USER env var (build-time identity for dev/non-prod)
 *   2. Fetch /api/health to learn the backend's auth mode
 *   3. If auth_mode=header and identity is available → call /api/auth/me to verify
 *   4. If auth_mode=off → show insecure-mode warning (no identity needed)
 *   5. If auth_mode=header and NO identity → show auth-required error banner
 *
 * Configuration:
 *   VITE_SENTRY_USER  — set in .env.development or .env.local
 *                       e.g. VITE_SENTRY_USER=j0w16ja
 *
 * Components consume via useAuth():
 *   - user: { id, role, is_admin } | null
 *   - authMode: 'header' | 'off' | null (null = still loading)
 *   - authWarning: string | null (insecure-mode warning)
 *   - authError: string | null (misconfiguration or rejected identity)
 *   - isReady: boolean (true once health + identity checks are done)
 */
import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  setSentryUser,
  fetchHealth,
  fetchAuthMe,
  type HealthResponse,
  type AuthMeResponse,
} from '../services/api';

// ── Types ────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  role: string;
  is_admin: boolean;
}

interface AuthContextValue {
  /** Verified user identity (null if not authenticated or still loading). */
  user: AuthUser | null;
  /** Backend auth mode: 'header' | 'off' | null (null = loading). */
  authMode: string | null;
  /** True when auth mode is 'header' (secure). */
  authEnabled: boolean;
  /** Warning message when auth is disabled (SENTRY_AUTH_MODE=off). */
  authWarning: string | null;
  /** Error message when auth is required but identity is missing/rejected. */
  authError: string | null;
  /** True once the auth flow has completed (health + identity checks). */
  isReady: boolean;
}

export const SENTRY_USER_SESSION_KEY = 'sentry.auth.user';

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ─────────────────────────────────────────────────────────────────

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser]               = useState<AuthUser | null>(null);
  const [authMode, setAuthMode]       = useState<string | null>(null);
  const [authWarning, setAuthWarning] = useState<string | null>(null);
  const [authError, setAuthError]     = useState<string | null>(null);
  const [isReady, setIsReady]         = useState(false);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      // ── Step 1: Read configured identity from env var or session login ─
      let storedUser = '';
      try {
        storedUser = window.sessionStorage.getItem(SENTRY_USER_SESSION_KEY) ?? '';
      } catch {
        storedUser = '';
      }
      const ignoreEnvUser = Boolean(
        (window as typeof window & { __SENTRY_E2E_DISABLE_ENV_USER__?: boolean }).__SENTRY_E2E_DISABLE_ENV_USER__,
      );
      const envUser = ignoreEnvUser ? '' : (import.meta.env.VITE_SENTRY_USER ?? '');
      const configuredUser = (envUser || storedUser).trim();

      // Wire identity into the API client immediately
      // (so /api/auth/me sends the header)
      if (configuredUser) {
        setSentryUser(configuredUser);
      }

      // ── Step 2: Fetch backend health to learn auth mode ──────────────
      let health: HealthResponse | null = null;
      try {
        health = await fetchHealth();
      } catch {
        // Backend offline — handled by VendorContext's backendOffline flag.
        // We still mark ourselves ready so the app renders.
        if (!cancelled) setIsReady(true);
        return;
      }

      if (cancelled) return;

      setAuthMode(health.auth_mode);
      setAuthWarning(health.auth_warning);

      // ── Step 3: Handle auth_mode=off (dev bypass) ────────────────────
      if (!health.auth_enabled) {
        // No identity verification needed — backend accepts everyone.
        setUser({ id: 'anonymous', role: 'admin', is_admin: true });
        setIsReady(true);
        return;
      }

      // ── Step 4: Auth is required — verify identity ───────────────────
      if (!configuredUser) {
        setAuthError(
          'Authentication is required but no user identity is configured. ' +
          'Enter your SENTRY user ID, or set VITE_SENTRY_USER in your .env.development file ' +
          '(e.g. VITE_SENTRY_USER=your_userid) and restart the dev server.'
        );
        setIsReady(true);
        return;
      }

      // ── Step 5: Verify identity against backend ──────────────────────
      try {
        const me: AuthMeResponse = await fetchAuthMe();
        if (!cancelled) {
          setUser({ id: me.id, role: me.role, is_admin: me.is_admin });
        }
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : String(err);
          if (msg.includes('401')) {
            setAuthError(
              `Authentication failed. The backend rejected the identity. ` +
              `Check that VITE_SENTRY_USER matches a user in SENTRY_ALLOWED_USERS.`
            );
          } else if (msg.includes('403')) {
            setAuthError(
              `User "${configuredUser}" is not authorized to access SENTRY. ` +
              `Ask an admin to add you to SENTRY_ALLOWED_USERS.`
            );
          } else {
            setAuthError(`Auth verification failed: ${msg}`);
          }
        }
      }

      if (!cancelled) setIsReady(true);
    };

    run();
    return () => { cancelled = true; };
  }, []);

  const authEnabled = authMode !== null && authMode !== 'off';

  return (
    <AuthContext.Provider value={{
      user,
      authMode,
      authEnabled,
      authWarning,
      authError,
      isReady,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// ── Hook ─────────────────────────────────────────────────────────────────────

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be called inside <AuthProvider>');
  return ctx;
};
