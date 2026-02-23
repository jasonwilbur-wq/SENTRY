/**
 * VendorContext — single source of truth for vendor data.
 *
 * Loads from the FastAPI backend via GET /api/vendors.
 * Shows a clear status message when the backend is not running.
 */
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { fetchVendors, fetchCategories, Vendor } from '../services/api';

interface VendorContextValue {
  vendors: Vendor[];
  categories: string[];
  loading: boolean;
  backendOffline: boolean;
  total: number;
  refetch: (params?: { category?: string; search?: string }) => Promise<void>;
}

const VendorContext = createContext<VendorContextValue | null>(null);

export const VendorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [vendors, setVendors]     = useState<Vendor[]>([]);
  const [categories, setCategories] = useState<string[]>(['All']);
  const [loading, setLoading]     = useState(true);
  const [backendOffline, setBackendOffline] = useState(false);
  const [total, setTotal]         = useState(0);

  const refetch = useCallback(async (params?: { category?: string; search?: string }) => {
    setLoading(true);
    try {
      const data = await fetchVendors(params);
      setVendors(data.vendors);
      setTotal(data.total);
      setBackendOffline(false);
    } catch {
      setBackendOffline(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      setLoading(true);
      try {
        const [vendorData, catData] = await Promise.all([
          fetchVendors(),
          fetchCategories(),
        ]);
        setVendors(vendorData.vendors);
        setTotal(vendorData.total);
        setCategories(['All', ...catData.categories]);
        setBackendOffline(false);
      } catch {
        setBackendOffline(true);
      } finally {
        setLoading(false);
      }
    };
    bootstrap();
  }, []);

  return (
    <VendorContext.Provider value={{
      vendors, categories, loading, backendOffline, total, refetch,
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