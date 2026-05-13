/**
 * useQuery — lightweight SWR-like data-fetching hook with:
 *  - In-memory cache (shared across components via module-level Map)
 *  - Stale-while-revalidate: returns cached data immediately, refetches in background
 *  - Deduplication: concurrent calls with the same key share one in-flight request
 *  - Configurable TTL (staleTime) and cache expiry (cacheTime)
 *  - Automatic cleanup on unmount
 *
 * Usage:
 *   const { data, error, isLoading, isValidating, mutate } = useQuery(
 *     ['vendors', category, page],
 *     () => fetchVendors({ category, page }),
 *     { staleTime: 30_000 }
 *   );
 */
import { useCallback, useEffect, useRef, useState } from 'react';

// ── Cache entry ──────────────────────────────────────────────────────────────

interface CacheEntry<T> {
  data: T;
  fetchedAt: number;         // Date.now() when data was last fetched
  error?: Error;
}

// Module-level shared cache and in-flight tracker
const cache = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

// ── Options ──────────────────────────────────────────────────────────────────

interface UseQueryOptions {
  /** Data older than this (ms) triggers a background revalidation. Default 30s. */
  staleTime?: number;
  /** Remove cache entry entirely after this (ms) of inactivity. Default 5min. */
  cacheTime?: number;
  /** Skip fetching when false (e.g. waiting for a dependency). Default true. */
  enabled?: boolean;
}

// ── Return value ─────────────────────────────────────────────────────────────

interface UseQueryResult<T> {
  data: T | undefined;
  error: Error | undefined;
  /** True only on first load (no cached data yet). */
  isLoading: boolean;
  /** True when a background revalidation is running. */
  isValidating: boolean;
  /** Manually trigger a refetch, optionally with optimistic data. */
  mutate: (optimistic?: T) => Promise<void>;
}

// ── Serialize key ────────────────────────────────────────────────────────────

function serializeKey(key: unknown[]): string {
  return JSON.stringify(key);
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useQuery<T>(
  key: unknown[],
  fetcher: () => Promise<T>,
  options?: UseQueryOptions,
): UseQueryResult<T> {
  const {
    staleTime = 30_000,
    cacheTime = 5 * 60_000,
    enabled = true,
  } = options ?? {};

  const cacheKey = serializeKey(key);
  const mountedRef = useRef(true);

  // Seed state from cache if available
  const cached = cache.get(cacheKey) as CacheEntry<T> | undefined;
  const [data, setData]                 = useState<T | undefined>(cached?.data);
  const [error, setError]               = useState<Error | undefined>(cached?.error);
  const [isValidating, setIsValidating] = useState(false);

  // ── Core fetch logic (deduplicated) ────────────────────────────────────

  const revalidate = useCallback(async () => {
    if (!enabled) return;

    // Dedup: if an identical request is in-flight, piggyback on it
    const existing = inflight.get(cacheKey);
    if (existing) {
      setIsValidating(true);
      try {
        const result = (await existing) as T;
        if (mountedRef.current) {
          setData(result);
          setError(undefined);
        }
      } catch (err) {
        if (mountedRef.current) setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        if (mountedRef.current) setIsValidating(false);
      }
      return;
    }

    setIsValidating(true);
    const promise = fetcher();
    inflight.set(cacheKey, promise);

    try {
      const result = await promise;
      cache.set(cacheKey, { data: result, fetchedAt: Date.now() });
      if (mountedRef.current) {
        setData(result);
        setError(undefined);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      cache.set(cacheKey, { data: data as any, fetchedAt: Date.now(), error });
      if (mountedRef.current) setError(error);
    } finally {
      inflight.delete(cacheKey);
      if (mountedRef.current) setIsValidating(false);
    }
  }, [cacheKey, enabled, fetcher, data]);

  // ── Mutate (manual refetch / optimistic update) ────────────────────────

  const mutate = useCallback(async (optimistic?: T) => {
    if (optimistic !== undefined) {
      setData(optimistic);
      cache.set(cacheKey, { data: optimistic, fetchedAt: Date.now() });
    }
    await revalidate();
  }, [cacheKey, revalidate]);

  // ── Effect: fetch on mount or when key changes ─────────────────────────

  useEffect(() => {
    mountedRef.current = true;

    if (!enabled) return;

    const entry = cache.get(cacheKey) as CacheEntry<T> | undefined;
    if (entry) {
      // Return cached data immediately
      setData(entry.data);
      setError(entry.error);

      // Retry immediately after cached failures with no usable data.
      // This prevents the UI from getting stuck in an offline/empty state
      // when the backend comes back after the first request failed.
      const hasUsableData = entry.data !== undefined && entry.data !== null;
      if (entry.error && !hasUsableData) {
        revalidate();
        return () => { mountedRef.current = false; };
      }

      // Revalidate in background if stale
      const age = Date.now() - entry.fetchedAt;
      if (age > staleTime) {
        revalidate();
      }
    } else {
      // No cache — fetch immediately
      revalidate();
    }

    return () => { mountedRef.current = false; };
  }, [cacheKey, enabled, staleTime, revalidate]);

  // ── Garbage collect expired cache entries ───────────────────────────────

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      for (const [k, entry] of cache.entries()) {
        if (now - (entry as CacheEntry<unknown>).fetchedAt > cacheTime) {
          cache.delete(k);
        }
      }
    }, 60_000); // check every minute
    return () => clearInterval(interval);
  }, [cacheTime]);

  const isLoading = !data && !error && enabled;

  return { data, error, isLoading, isValidating, mutate };
}

// ── Utilities ────────────────────────────────────────────────────────────────

/** Invalidate all cache entries whose key starts with the given prefix. */
export function invalidateQueries(keyPrefix: unknown[]): void {
  const prefix = JSON.stringify(keyPrefix).slice(0, -1); // remove trailing ]
  for (const k of cache.keys()) {
    if (k.startsWith(prefix)) cache.delete(k);
  }
}

/** Clear the entire cache. */
export function clearQueryCache(): void {
  cache.clear();
}
