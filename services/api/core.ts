/**
 * Centralized API client for all SENTRY backend calls.
 *
 * Dev  : If VITE_API_URL is set, requests go directly to that backend URL.
 *        Otherwise calls stay relative and Vite proxy handles /api/*.
 * Prod : VITE_API_URL can point at Cloud Run, or remain empty when Firebase
 *        hosting rewrites /api/* to the backend service.
 *
 * NEVER hardcode localhost anywhere else in the codebase — use getDownloadUrl().
 */

import { trackEvent } from '../analytics';

const VITE_ENV = (import.meta as any).env ?? {};

/**
 * API base resolution (single source of truth):
 * 1) If VITE_API_URL is set, always use it (dev + prod).
 * 2) Otherwise fall back to relative paths so Vite/Firebase proxy can handle /api.
 */
const RAW_API_BASE = String(VITE_ENV.VITE_API_URL ?? '').trim();
const IS_LOCAL_DEV_ORIGIN = typeof window !== 'undefined'
  && ['localhost', '127.0.0.1'].includes(window.location.hostname);
const API_BASE: string = IS_LOCAL_DEV_ORIGIN ? '' : (RAW_API_BASE || '');

let sentryUserHeader: string | null = null;

export function setSentryUser(userId: string | null): void {
  const trimmed = userId?.trim();
  sentryUserHeader = trimmed ? trimmed : null;
}

function buildHeaders(extraHeaders?: HeadersInit): Headers {
  const headers = new Headers(extraHeaders ?? {});
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (sentryUserHeader) {
    headers.set('X-Sentry-User', sentryUserHeader);
  }
  return headers;
}

/**
 * Returns the full URL for a VAR report download via the backend proxy.
 * Works in dev (relative) and production (absolute Cloud Run URL).
 */
export function getDownloadUrl(varId: string): string {
  return `${API_BASE}/api/vars/download/${varId}`;
}

export async function apiFetch(path: string, options?: RequestInit): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers: buildHeaders(options?.headers),
  });
}

export async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const method = options?.method ?? 'GET';
  const startedAt = performance.now();

  const doFetch = async (base: string): Promise<T> => {
    const controller = new AbortController();
    const timeoutMs = 12000;
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(`${base}${path}`, {
        ...options,
        headers: buildHeaders(options?.headers),
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => 'Unknown error');
        throw new Error(`API ${res.status}: ${text}`);
      }

      return res.json() as Promise<T>;
    } finally {
      window.clearTimeout(timeout);
    }
  };

  try {
    const data = await doFetch(API_BASE);
    const durationMs = Math.round(performance.now() - startedAt);
    trackEvent('api_request_succeeded', {
      path,
      method,
      status: 200,
      duration_ms: durationMs,
      api_base: API_BASE || 'relative',
    });
    return data;
  } catch (error) {
    const isHttpError = error instanceof Error && error.message.startsWith('API ');

    // Fallback: if VITE_API_URL is set but unreachable, try relative /api path
    // so Vite/Firebase proxy can still serve data.
    if (!isHttpError && API_BASE) {
      try {
        const fallbackData = await doFetch('');
        const durationMs = Math.round(performance.now() - startedAt);
        trackEvent('api_request_fallback_succeeded', {
          path,
          method,
          duration_ms: durationMs,
          failed_api_base: API_BASE,
        });
        return fallbackData;
      } catch {
        // Continue to canonical error tracking below.
      }
    }

    const durationMs = Math.round(performance.now() - startedAt);
    trackEvent(isHttpError ? 'api_request_failed' : 'api_request_exception', {
      path,
      method,
      duration_ms: durationMs,
      message: error instanceof Error ? error.message : 'Unknown error',
      api_base: API_BASE || 'relative',
    });

    throw error;
  }
}

