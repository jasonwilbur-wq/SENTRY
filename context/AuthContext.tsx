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
  /** Backend auth mode: header | off | oidc | iap | trusted-header | null. */
  authMode: string | null;
  /** Backend provider label from /api/health. */
  authProvider: string | null;
  /** True when auth is enabled. */
  authEnabled: boolean;
  /** True when the app should show a local/dev user-id login form. */
  canUseLocalIdentity: boolean;
  /** Warning message when auth is disabled or running in a non-production-safe mode. */
  authWarning: string | null;
  /** Error message when auth is required but identity is missing/rejected. */
  authError: string | null;
  /** True once the auth flow has completed (health + identity checks). */
  isReady: boolean;
  /** Local/dev login. Production uses SSO/IAP instead. */
  loginWithIdentity: (userId: string) => void;
  /** Hosted login. Usually reloads through the approved SSO/IAP entry point. */
  loginWithSso: () => void;
  /** Clear local auth state and, when configured, navigate to provider logout. */
  logout: () => void;
}

export const SENTRY_USER_SESSION_KEY = 'sentry.auth.user';
export const SENTRY_LOGGED_OUT_KEY = 'sentry.auth.logged_out';

const VITE_ENV = (import.meta as any).env ?? {};
const LOGIN_URL = String(VITE_ENV.VITE_SENTRY_LOGIN_URL ?? '').trim();
const LOGOUT_URL = String(VITE_ENV.VITE_SENTRY_LOGOUT_URL ?? '').trim();

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ─────────────────────────────────────────────────────────────────

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser]               = useState<AuthUser | null>(null);
  const [authMode, setAuthMode]         = useState<string | null>(null);
  const [authProvider, setAuthProvider] = useState<string | null>(null);
  const [authWarning, setAuthWarning]   = useState<string | null>(null);
  const [authError, setAuthError]       = useState<string | null>(null);
  const [isReady, setIsReady]           = useState(false);

  const loginWithIdentity = (userId: string) => {
    const trimmed = userId.trim();
    if (!trimmed) return;
    try {
      window.sessionStorage.removeItem(SENTRY_LOGGED_OUT_KEY);
      window.sessionStorage.setItem(SENTRY_USER_SESSION_KEY, trimmed);
    } catch { /* noop */ }
    window.location.reload();
  };

  const loginWithSso = () => {
    try { window.sessionStorage.removeItem(SENTRY_LOGGED_OUT_KEY); } catch { /* noop */ }
    if (LOGIN_URL) {
      window.location.assign(LOGIN_URL);
      return;
    }
    window.location.reload();
  };

  const logout = () => {
    try {
      window.sessionStorage.setItem(SENTRY_LOGGED_OUT_KEY, 'true');
      window.sessionStorage.removeItem(SENTRY_USER_SESSION_KEY);
    } catch { /* noop */ }
    setSentryUser(null);
    setUser(null);

    if (LOGOUT_URL) {
      const returnTo = encodeURIComponent(window.location.origin + window.location.pathname);
      window.location.assign(LOGOUT_URL.replace('{returnTo}', returnTo));
      return;
    }

    if (authMode === 'iap') {
      const continueTo = encodeURIComponent(window.location.origin + window.location.pathname);
      window.location.assign(`/_gcp_iap/clear_login_cookie?continue=${continueTo}`);
      return;
    }

    window.location.reload();
  };

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      // ── Step 1: Read configured identity/token from env var or session login ─
      let storedUser = '';
      let localLoggedOut = false;
      try {
        storedUser = window.sessionStorage.getItem(SENTRY_USER_SESSION_KEY) ?? '';
        localLoggedOut = window.sessionStorage.getItem(SENTRY_LOGGED_OUT_KEY) === 'true';
      } catch {
        storedUser = '';
        localLoggedOut = false;
      }
      setSentryUser(null);
      const ignoreEnvUser = Boolean(
        (window as typeof window & { __SENTRY_E2E_DISABLE_ENV_USER__?: boolean }).__SENTRY_E2E_DISABLE_ENV_USER__,
      );
      const envUser = ignoreEnvUser || localLoggedOut ? '' : (VITE_ENV.VITE_SENTRY_USER ?? '');
      const configuredUser = (envUser || storedUser).trim();

      // Wire identity into the API client immediately.
      // Header identity is local/dev only. Hosted auth should come from SSO/IAP.
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
      setAuthProvider(health.auth_provider ?? health.auth_mode);
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
        const hostedAuth = ['oidc', 'iap', 'trusted-header'].includes(health.auth_mode);
        setAuthError(
          hostedAuth
            ? 'SENTRY requires enterprise SSO. Use Sign in with SSO or open SENTRY through the approved GCP/IAP or Walmart SSO entry URL so the platform can assert your identity.'
            : 'Authentication is required but no user identity is configured. Enter your SENTRY user ID, or set VITE_SENTRY_USER in your .env.development file (e.g. VITE_SENTRY_USER=your_userid) and restart the dev server.'
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
              `For local header auth, check VITE_SENTRY_USER. For hosted auth, reopen through the approved SSO/IAP entry point.`
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
  const canUseLocalIdentity = authMode === 'header';

  return (
    <AuthContext.Provider value={{
      user,
      authMode,
      authProvider,
      authEnabled,
      canUseLocalIdentity,
      authWarning,
      authError,
      isReady,
      loginWithIdentity,
      loginWithSso,
      logout,
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
