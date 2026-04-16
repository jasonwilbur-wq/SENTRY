/**
 * VendorContext — single source of truth for vendor data, filters, and pagination.
 *
 * Architecture:
 *   - `search`, `category`, `page` are the controlled filter states.
 *   - Search is debounced (300ms) via a separate `debouncedSearch` state.
 *   - A single useEffect reacts to [debouncedSearch, category, page] and
 *     fires the API call with SWR-like caching (stale-while-revalidate).
 *   - Setting search or category resets page to 1 automatically.
 *   - Categories are cached for 5 minutes to avoid redundant fetches.
 *   - Stats are exposed via a dedicated hook with independent caching.
 */
import React, {
  createContext, useContext, useEffect, useState, useCallback, useMemo,
} from 'react';
import {
  fetchVendors, fetchCategories, fetchStats,
  Vendor, VendorsResponse, DirectoryStats,
} from '../services/api';
import { useQuery } from '../hooks/useQuery';

const PAGE_SIZE = 20;

interface VendorContextValue {
  vendors:        Vendor[];
  categories:     string[];
  loading:        boolean;
  backendOffline: boolean;
  // Counts
  total:      number;   // total matching vendors across all pages
  totalPages: number;
  // Controlled filter state (read-only from consumers)
  search:   string;
  category: string;
  page:     number;
  // Setters
  setSearch:   (s: string) => void;
  setCategory: (c: string) => void;
  setPage:     (p: number) => void;
  // Stats (cached separately)
  stats:        DirectoryStats | null;
  statsLoading: boolean;
  refreshStats: () => Promise<void>;
}

const VendorContext = createContext<VendorContextValue | null>(null);

export const VendorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Filter state
  const [search,          setSearchRaw]   = useState('');
  const [debouncedSearch, setDebounced]   = useState('');
  const [category,        setCategoryRaw] = useState('All');
  const [page,            setPageRaw]     = useState(1);

  // ── Debounce search ────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // ── Vendor data via SWR-like cache ─────────────────────────────────────
  const vendorQueryKey = useMemo(
    () => ['vendors', debouncedSearch, category, page],
    [debouncedSearch, category, page],
  );

  const vendorFetcher = useCallback(
    () => fetchVendors({
      search:    debouncedSearch || undefined,
      category:  category !== 'All' ? category : undefined,
      page,
      page_size: PAGE_SIZE,
    }),
    [debouncedSearch, category, page],
  );

  const {
    data: vendorData,
    error: vendorError,
    isLoading: vendorsLoading,
    isValidating: vendorsValidating,
  } = useQuery<VendorsResponse>(vendorQueryKey, vendorFetcher, {
    staleTime: 30_000,   // 30s before background revalidation
    cacheTime: 300_000,  // 5min before cache eviction
  });

  // ── Categories (cached for 5 min, fetched once) ────────────────────────
  const categoriesFetcher = useCallback(() => fetchCategories(), []);
  const { data: categoriesData } = useQuery<{ categories: string[] }>(
    ['categories'],
    categoriesFetcher,
    { staleTime: 300_000, cacheTime: 600_000 },
  );

  // ── Stats (cached, refreshable) ────────────────────────────────────────
  const statsFetcher = useCallback(() => fetchStats(), []);
  const {
    data: statsData,
    isLoading: statsLoading,
    mutate: refreshStats,
  } = useQuery<DirectoryStats>(
    ['directoryStats'],
    statsFetcher,
    { staleTime: 60_000, cacheTime: 300_000 },
  );

  // ── Derived values ─────────────────────────────────────────────────────
  const vendors    = vendorData?.vendors ?? [];
  const total      = vendorData?.total ?? 0;
  const totalPages = vendorData?.total_pages ?? 1;
  const categories = useMemo(
    () => ['All', ...(categoriesData?.categories ?? [])],
    [categoriesData],
  );
  const loading        = vendorsLoading || vendorsValidating;
  const backendOffline = !!vendorError;

  // ── Public setters ────────────────────────────────────────────────────
  // Changing search or category always resets to page 1
  const setSearch   = useCallback((s: string) => { setSearchRaw(s);  setPageRaw(1); }, []);
  const setCategory = useCallback((c: string) => { setCategoryRaw(c); setPageRaw(1); }, []);
  const setPage     = useCallback((p: number) => { setPageRaw(p); }, []);

  return (
    <VendorContext.Provider value={{
      vendors, categories, loading, backendOffline,
      total, totalPages, search, category, page,
      setSearch, setCategory, setPage,
      stats: statsData ?? null, statsLoading, refreshStats,
    }}>
      {children}
    </VendorContext.Provider>
  );
};

export const useVendors = (): VendorContextValue => {
  const ctx = useContext(VendorContext);
  if (!ctx) throw new Error('useVendors must be called inside <VendorProvider>');
  return ctx;
};

/** @deprecated Use useVendors() instead — kept for backward compat with WalmartSpark */
export const useVendor = useVendors;
