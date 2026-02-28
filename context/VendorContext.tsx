/**
 * VendorContext — single source of truth for vendor data, filters, and pagination.
 *
 * Architecture:
 *   - `search`, `category`, `page` are the controlled filter states.
 *   - Search is debounced (300ms) via a separate `debouncedSearch` state.
 *   - A single useEffect reacts to [debouncedSearch, category, page] and
 *     fires the API call. Simple, predictable, no timer juggling in setters.
 *   - Setting search or category resets page to 1 automatically.
 */
import React, {
  createContext, useContext, useEffect, useState, useCallback,
} from 'react';
import { fetchVendors, fetchCategories, Vendor } from '../services/api';

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
}

const VendorContext = createContext<VendorContextValue | null>(null);

export const VendorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [vendors,        setVendors]        = useState<Vendor[]>([]);
  const [categories,     setCategories]     = useState<string[]>(['All']);
  const [loading,        setLoading]        = useState(true);
  const [backendOffline, setBackendOffline] = useState(false);
  const [total,          setTotal]          = useState(0);
  const [totalPages,     setTotalPages]     = useState(1);

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

  // ── Fetch whenever debounced search / category / page changes ────────────
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const data = await fetchVendors({
          search:    debouncedSearch || undefined,
          category:  category !== 'All' ? category : undefined,
          page,
          page_size: PAGE_SIZE,
        });
        if (cancelled) return;
        setVendors(data.vendors);
        setTotal(data.total);
        setTotalPages(data.total_pages);
        setBackendOffline(false);
      } catch {
        if (!cancelled) setBackendOffline(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [debouncedSearch, category, page]);

  // ── Bootstrap categories list (one-time) ───────────────────────────
  useEffect(() => {
    fetchCategories()
      .then(d => setCategories(['All', ...d.categories]))
      .catch(() => {/* categories are non-critical */});
  }, []);

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
