/**
 * VendorManager — editable vendor roster for a SENTRY project.
 * Consumed by ProjectAdminPanel.
 */
import React, { useState } from 'react';
import { apiFetch } from '../services/api';

export interface ProjectVendor {
  id: string;
  project_id: string;
  vendor_name: string;
  vendor_id: string;
  role: string;
  status: 'active' | 'evaluating' | 'inactive' | 'removed';
  notes: string;
  added_at: string;
  updated_at: string;
}

const VENDOR_STATUS_OPTIONS = ['active', 'evaluating', 'inactive', 'removed'] as const;
const VENDOR_ROLE_OPTIONS   = ['Primary Vendor', 'Alternative', 'Evaluating', 'Partner', 'Sub-Contractor', 'Vendor'];

export const vendorStatusCfg = {
  active:     { color: '#22c55e', label: 'Active',     icon: '✓' },
  evaluating: { color: '#9BB7DF', label: 'Evaluating', icon: '◎' },
  inactive:   { color: '#94a3b8', label: 'Inactive',   icon: '○' },
  removed:    { color: '#f87171', label: 'Removed',    icon: '✕' },
} as const;

// ── shared style helpers (duplicated lightly from ProjectAdminPanel) ──────────
const field = (isDark: boolean): React.CSSProperties => ({
  width: '100%', padding: '7px 10px', borderRadius: 7, fontSize: 13,
  background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
  border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.14)'}`,
  color: isDark ? '#e2e8f0' : '#0f172a', outline: 'none', boxSizing: 'border-box',
});

const selectStyle = (isDark: boolean): React.CSSProperties => ({
  ...field(isDark), cursor: 'pointer',
});

const optStyle = (isDark: boolean): React.CSSProperties => ({
  background: isDark ? '#1e293b' : '#fff', color: isDark ? '#e2e8f0' : '#0f172a',
});

const subtlePanel = (isDark: boolean): React.CSSProperties => ({
  background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
  border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
  borderRadius: 10, padding: '12px 14px',
});

const FormLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em',
    color: 'rgba(148,163,184,0.8)', marginBottom: 4 }}>{children}</p>
);

// ── Main component ─────────────────────────────────────────────────────────────

const VendorManager: React.FC<{
  projectId: string;
  isDark: boolean;
  vendors: ProjectVendor[];
  onVendorsChange: (vendors: ProjectVendor[]) => void;
}> = ({ projectId, isDark, vendors, onVendorsChange }) => {
  const [saving, setSaving]     = useState<string | null>(null);
  const [adding, setAdding]     = useState(false);
  const [newVendor, setNewVendor] = useState({
    vendor_name: '', role: 'Vendor', status: 'active' as ProjectVendor['status'], notes: '',
  });

  const saveNew = async () => {
    if (!newVendor.vendor_name.trim()) return;
    setSaving('new');
    try {
      const res = await apiFetch(`/api/projects/${projectId}/vendors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newVendor),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const created: ProjectVendor = await res.json();
      onVendorsChange([...vendors, created]);
      setNewVendor({ vendor_name: '', role: 'Vendor', status: 'active', notes: '' });
      setAdding(false);
    } finally { setSaving(null); }
  };

  const patchVendor = async (id: string, patch: Partial<ProjectVendor>) => {
    setSaving(id);
    try {
      const res = await apiFetch(`/api/projects/${projectId}/vendors/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const updated: ProjectVendor = await res.json();
      onVendorsChange(vendors.map(v => v.id === id ? updated : v));
    } finally { setSaving(null); }
  };

  const removeVendor = async (id: string) => {
    if (!window.confirm('Remove this vendor from the project?')) return;
    setSaving(id);
    try {
      const res = await apiFetch(`/api/projects/${projectId}/vendors/${id}?confirm=true`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      onVendorsChange(vendors.filter(v => v.id !== id));
    } finally { setSaving(null); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {vendors.map(v => {
        const cfg      = vendorStatusCfg[v.status] ?? vendorStatusCfg.inactive;
        const isSaving = saving === v.id;
        return (
          <div key={v.id} style={{
            background: `${cfg.color}0D`, border: `1px solid ${cfg.color}35`,
            borderRadius: 10, padding: '12px 14px',
            opacity: isSaving ? 0.6 : 1, transition: 'opacity 0.15s',
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
              <div>
                <FormLabel>Vendor Name</FormLabel>
                <input
                  style={field(isDark)}
                  value={v.vendor_name}
                  placeholder="e.g. Skydio"
                  onChange={e => onVendorsChange(vendors.map(x => x.id === v.id ? { ...x, vendor_name: e.target.value } : x))}
                  onBlur={e => patchVendor(v.id, { vendor_name: e.target.value })}
                />
              </div>
              <div>
                <FormLabel>Role</FormLabel>
                <select style={selectStyle(isDark)} value={v.role}
                  onChange={e => patchVendor(v.id, { role: e.target.value })}>
                  {VENDOR_ROLE_OPTIONS.map(r => (
                    <option key={r} value={r} style={optStyle(isDark)}>{r}</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: 8, alignItems: 'end' }}>
              <div>
                <FormLabel>Status</FormLabel>
                <select style={{ ...selectStyle(isDark), color: cfg.color }} value={v.status}
                  onChange={e => patchVendor(v.id, { status: e.target.value as ProjectVendor['status'] })}>
                  {VENDOR_STATUS_OPTIONS.map(s => (
                    <option key={s} value={s} style={optStyle(isDark)}>
                      {vendorStatusCfg[s].icon} {vendorStatusCfg[s].label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <FormLabel>Notes</FormLabel>
                <input
                  style={field(isDark)}
                  value={v.notes}
                  placeholder="Context, reason for status, etc."
                  onChange={e => onVendorsChange(vendors.map(x => x.id === v.id ? { ...x, notes: e.target.value } : x))}
                  onBlur={e => patchVendor(v.id, { notes: e.target.value })}
                />
              </div>
              <button
                onClick={() => removeVendor(v.id)}
                disabled={isSaving}
                style={{
                  padding: '8px 12px', borderRadius: 8,
                  border: '1px solid rgba(234,17,0,0.35)',
                  background: 'rgba(234,17,0,0.1)', color: '#ea1100',
                  cursor: isSaving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700,
                }}>✕</button>
            </div>
          </div>
        );
      })}

      {/* Add new vendor row */}
      {adding ? (
        <div style={subtlePanel(isDark)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
            <div>
              <FormLabel>Vendor Name *</FormLabel>
              <input
                style={field(isDark)} autoFocus
                value={newVendor.vendor_name}
                placeholder="e.g. Skydio"
                onChange={e => setNewVendor(p => ({ ...p, vendor_name: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && saveNew()}
              />
            </div>
            <div>
              <FormLabel>Role</FormLabel>
              <select style={selectStyle(isDark)} value={newVendor.role}
                onChange={e => setNewVendor(p => ({ ...p, role: e.target.value }))}>
                {VENDOR_ROLE_OPTIONS.map(r => <option key={r} value={r} style={optStyle(isDark)}>{r}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto auto', gap: 8, alignItems: 'end' }}>
            <div>
              <FormLabel>Status</FormLabel>
              <select style={selectStyle(isDark)} value={newVendor.status}
                onChange={e => setNewVendor(p => ({ ...p, status: e.target.value as ProjectVendor['status'] }))}>
                {VENDOR_STATUS_OPTIONS.map(s => (
                  <option key={s} value={s} style={optStyle(isDark)}>
                    {vendorStatusCfg[s].icon} {vendorStatusCfg[s].label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <FormLabel>Notes</FormLabel>
              <input style={field(isDark)} value={newVendor.notes}
                placeholder="Context, notes..."
                onChange={e => setNewVendor(p => ({ ...p, notes: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && saveNew()}
              />
            </div>
            <button
              onClick={saveNew}
              disabled={saving === 'new' || !newVendor.vendor_name.trim()}
              style={{
                padding: '8px 16px', borderRadius: 8, border: 'none',
                background: '#0053e2', color: '#fff',
                cursor: saving === 'new' ? 'not-allowed' : 'pointer',
                fontSize: 12, fontWeight: 700,
              }}>Add</button>
            <button
              onClick={() => setAdding(false)}
              style={{
                padding: '8px 12px', borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.15)',
                background: 'transparent', color: 'rgba(148,163,184,0.8)',
                cursor: 'pointer', fontSize: 12,
              }}>Cancel</button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          style={{
            padding: '8px 14px', borderRadius: 8, cursor: 'pointer',
            fontSize: 12, fontWeight: 700,
            border: '1px dashed rgba(0,83,226,0.4)',
            background: isDark ? 'rgba(0,83,226,0.06)' : 'rgba(0,83,226,0.04)',
            color: '#0053e2', alignSelf: 'flex-start',
          }}>+ Add Vendor</button>
      )}
    </div>
  );
};

export default VendorManager;