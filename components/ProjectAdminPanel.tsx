import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ═══════════════════════════════════════════════════════════════════════
// Project Portfolio Admin Panel
// Manual CRUD for EST project metadata, compliance IDs, and phase gates
// ═══════════════════════════════════════════════════════════════════════

interface NdaEntry { nda_number: string; vendor: string; status: string; note: string; }

interface Project {
  project_id: string; project_name: string; summary: string; managing_unit: string;
  lifecycle_state: string; health: string; current_phase: string; est_phase_index: number;
  risk_score: number; sensitivity: string; tags: string; progress_pct: number;
  next_milestone: string; next_due_date: string; blockers_count: number;
  last_update_at: string; last_update_by: string; est_cost: string; business_owner: string;
  nda_numbers: NdaEntry[]; erpa_number: string; erpa_status: string;
  apm_number: string; apm_status: string; ssp_number: string; ssp_status: string;
  compliance_notes: string;
}

const EST_PHASE_LABELS: Record<number, string> = {
  1: 'VAR / Intake', 2: 'Vendor Engagement', 3: 'NDA & Legal Gating',
  4: 'ROM & Technical Assessment', 5: 'Lab Testing (PoT/PoC)',
  6: 'APM / ERPA / SSP', 7: 'Pilot (LAO)', 8: 'BAU / Program',
};

const COMPLIANCE_STATUSES = ['not_started', 'in_progress', 'under_review', 'complete'];
const HEALTH_OPTIONS      = ['green', 'yellow', 'red'];
const LIFECYCLE_OPTIONS   = ['active', 'on_hold', 'blocked', 'ended'];
const NDA_STATUS_OPTIONS  = ['executed', 'pending', 'via_msa', 'expired'];

// ── Small re-usable form atoms ──────────────────────────────────────────

const inputCls = `w-full px-3 py-2 rounded-lg text-sm text-white
  border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.05)]
  focus:outline-none focus:border-[#0053e2] focus:ring-1 focus:ring-[#0053e2]
  placeholder-slate-500 transition-colors`;

const selectCls = `${inputCls} cursor-pointer`;

const FormLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <label style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase',
    letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 5 }}>
    {children}
  </label>
);

const SectionHeader: React.FC<{ icon: string; title: string; subtitle?: string }> = ({ icon, title, subtitle }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.07)', marginBottom: 16 }}>
    <span style={{ fontSize: 18 }}>{icon}</span>
    <div>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{title}</div>
      {subtitle && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>{subtitle}</div>}
    </div>
  </div>
);

const HealthDot: React.FC<{ health: string }> = ({ health }) => {
  const c = health === 'green' ? '#22c55e' : health === 'yellow' ? '#ffc220' : '#ea1100';
  return <span style={{ width: 8, height: 8, borderRadius: '50%', background: c,
    display: 'inline-block', flexShrink: 0, boxShadow: `0 0 6px ${c}` }} />;
};

const SaveToast: React.FC<{ status: 'success' | 'error'; message: string }> = ({ status, message }) => (
  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
    style={{
      position: 'fixed', bottom: 28, right: 28, zIndex: 9999,
      padding: '12px 20px', borderRadius: 12, fontWeight: 700, fontSize: 13,
      background: status === 'success' ? 'rgba(34,197,94,0.15)' : 'rgba(234,17,0,0.15)',
      border: `1px solid ${status === 'success' ? '#22c55e60' : '#ea110060'}`,
      color: status === 'success' ? '#22c55e' : '#ea1100',
      backdropFilter: 'blur(12px)',
      boxShadow: `0 8px 32px ${status === 'success' ? 'rgba(34,197,94,0.2)' : 'rgba(234,17,0,0.2)'}`,
    }}>
    {status === 'success' ? '✓' : '✕'} {message}
  </motion.div>
);

// ── NDA Manager sub-component ──────────────────────────────────────────

const NdaManager: React.FC<{
  ndas: NdaEntry[];
  onChange: (ndas: NdaEntry[]) => void;
}> = ({ ndas, onChange }) => {
  const add = () => onChange([...ndas, { nda_number: '', vendor: '', status: 'executed', note: '' }]);
  const remove = (i: number) => onChange(ndas.filter((_, idx) => idx !== i));
  const update = (i: number, field: keyof NdaEntry, val: string) =>
    onChange(ndas.map((n, idx) => idx === i ? { ...n, [field]: val } : n));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {ndas.map((nda, i) => (
        <div key={i} style={{
          background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.2)',
          borderRadius: 10, padding: '12px 14px',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
            <div>
              <FormLabel>NDA Number (Coupa)</FormLabel>
              <input className={inputCls} value={nda.nda_number} placeholder="e.g. 92431"
                onChange={e => update(i, 'nda_number', e.target.value)} />
            </div>
            <div>
              <FormLabel>Vendor / Counterparty</FormLabel>
              <input className={inputCls} value={nda.vendor} placeholder="e.g. Sunflower Labs"
                onChange={e => update(i, 'vendor', e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: 8, alignItems: 'end' }}>
            <div>
              <FormLabel>Status</FormLabel>
              <select className={selectCls} value={nda.status} onChange={e => update(i, 'status', e.target.value)}>
                {NDA_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              <FormLabel>Note (signatory, date, etc.)</FormLabel>
              <input className={inputCls} value={nda.note} placeholder="e.g. Larry Lundeen signatory, 2025-07-23"
                onChange={e => update(i, 'note', e.target.value)} />
            </div>
            <button onClick={() => remove(i)} style={{
              padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(234,17,0,0.3)',
              background: 'rgba(234,17,0,0.1)', color: '#ea1100', cursor: 'pointer',
              fontSize: 13, fontWeight: 700,
            }}>✕</button>
          </div>
        </div>
      ))}
      <button onClick={add} style={{
        padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700,
        border: '1px dashed rgba(168,85,247,0.4)', background: 'rgba(168,85,247,0.06)',
        color: '#c084fc', alignSelf: 'flex-start',
      }}>
        + Add NDA Entry
      </button>
    </div>
  );
};

// ── Compliance ID row ────────────────────────────────────────────────

const ComplianceRow: React.FC<{
  label: string; accent: string;
  number: string; status: string;
  placeholder: string;
  onNumberChange: (v: string) => void;
  onStatusChange: (v: string) => void;
}> = ({ label, accent, number, status, placeholder, onNumberChange, onStatusChange }) => (
  <div style={{
    background: `${accent}08`, border: `1px solid ${accent}25`,
    borderRadius: 10, padding: '12px 14px',
    display: 'grid', gridTemplateColumns: '80px 1fr 160px', gap: 12, alignItems: 'end',
  }}>
    <div style={{ fontSize: 11, fontWeight: 800, color: accent, paddingTop: 22,
      textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
    <div>
      <FormLabel>Reference Number</FormLabel>
      <input className={inputCls} value={number} placeholder={placeholder}
        onChange={e => onNumberChange(e.target.value)} />
    </div>
    <div>
      <FormLabel>Status</FormLabel>
      <select className={selectCls} value={status} onChange={e => onStatusChange(e.target.value)}>
        {COMPLIANCE_STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
      </select>
    </div>
  </div>
);

// ── Edit form ────────────────────────────────────────────────────────

const EditForm: React.FC<{
  project: Project;
  onSaved: (updated: Project) => void;
}> = ({ project, onSaved }) => {
  const [form, setForm] = useState<Project>({ ...project });
  const [saving, setSaving] = useState(false);
  const [toast, setToast]   = useState<{ status: 'success' | 'error'; message: string } | null>(null);
  const [dirty, setDirty]   = useState(false);

  // Reset when a different project is selected
  useEffect(() => { setForm({ ...project }); setDirty(false); }, [project.project_id]);

  const set = (field: keyof Project, val: unknown) => {
    setForm(f => ({ ...f, [field]: val }));
    setDirty(true);
  };

  const showToast = (status: 'success' | 'error', message: string) => {
    setToast({ status, message });
    setTimeout(() => setToast(null), 3500);
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        health: form.health, lifecycle_state: form.lifecycle_state,
        current_phase: form.current_phase, est_phase_index: form.est_phase_index,
        progress_pct: form.progress_pct, blockers_count: form.blockers_count,
        next_milestone: form.next_milestone, next_due_date: form.next_due_date,
        last_update_by: form.last_update_by,
        nda_numbers: form.nda_numbers,
        erpa_number: form.erpa_number, erpa_status: form.erpa_status,
        apm_number: form.apm_number, apm_status: form.apm_status,
        ssp_number: form.ssp_number, ssp_status: form.ssp_status,
        compliance_notes: form.compliance_notes,
      };
      const res = await fetch(`/api/projects/${form.project_id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const updated: Project = await res.json();
      onSaved(updated);
      setDirty(false);
      showToast('success', `${updated.project_name} saved successfully`);
    } catch (err) {
      showToast('error', `Save failed: ${err}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Form header */}
      <div style={{
        padding: '20px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)',
        background: 'rgba(0,0,0,0.2)', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <HealthDot health={form.health} />
          <span style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>{form.project_name}</span>
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>
          {form.project_id} · Phase {form.est_phase_index}/8
        </div>
      </div>

      {/* Scrollable form body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

          {/* ─ Status & Health */}
          <div>
            <SectionHeader icon="🟡" title="Status & Health" subtitle="Project lifecycle state and RAG indicator" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              <div>
                <FormLabel>Health (RAG)</FormLabel>
                <select className={selectCls} value={form.health} onChange={e => set('health', e.target.value)}>
                  {HEALTH_OPTIONS.map(h => <option key={h} value={h}>{h.charAt(0).toUpperCase() + h.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <FormLabel>Lifecycle State</FormLabel>
                <select className={selectCls} value={form.lifecycle_state} onChange={e => set('lifecycle_state', e.target.value)}>
                  {LIFECYCLE_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div>
                <FormLabel>Progress %</FormLabel>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="range" min={0} max={100} value={form.progress_pct}
                    onChange={e => set('progress_pct', Number(e.target.value))}
                    style={{ flex: 1, accentColor: '#0053e2' }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#0053e2', minWidth: 36, textAlign: 'right' }}>
                    {form.progress_pct}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ─ EST Phase Gate */}
          <div>
            <SectionHeader icon="🗓️" title="EST Phase Gate" subtitle="Current lifecycle phase — drives the timeline visualization" />
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <FormLabel>Phase Index (1–8)</FormLabel>
                <select className={selectCls} value={form.est_phase_index}
                  onChange={e => set('est_phase_index', Number(e.target.value))}
                  style={{ minWidth: 80 }}>
                  {Object.entries(EST_PHASE_LABELS).map(([idx, label]) => (
                    <option key={idx} value={idx}>Ph.{idx} — {label}</option>
                  ))}
                </select>
              </div>
              <div>
                <FormLabel>Phase Label (free text)</FormLabel>
                <input className={inputCls} value={form.current_phase} placeholder="e.g. Lab Testing"
                  onChange={e => set('current_phase', e.target.value)} />
              </div>
            </div>
            {/* Phase visual bar */}
            <div style={{ display: 'flex', gap: 4 }}>
              {[1,2,3,4,5,6,7,8].map(i => (
                <button key={i} onClick={() => { set('est_phase_index', i); set('current_phase', EST_PHASE_LABELS[i]); }}
                  style={{
                    flex: 1, height: 6, borderRadius: 99, cursor: 'pointer', border: 'none',
                    background: i <= form.est_phase_index ? '#0053e2' : 'rgba(255,255,255,0.1)',
                    boxShadow: i === form.est_phase_index ? '0 0 10px rgba(0,83,226,0.6)' : 'none',
                    transition: 'all 0.15s',
                  }} />
              ))}
            </div>
            <div style={{ fontSize: 10, color: '#0053e2', fontWeight: 700, marginTop: 6 }}>
              Phase {form.est_phase_index}: {EST_PHASE_LABELS[form.est_phase_index]}
            </div>
          </div>

          {/* ─ Next Milestone */}
          <div>
            <SectionHeader icon="🏁" title="Next Milestone" subtitle="30-day target and any active blockers" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 80px', gap: 12 }}>
              <div>
                <FormLabel>Milestone Description</FormLabel>
                <input className={inputCls} value={form.next_milestone}
                  placeholder="e.g. Privacy Impact Assessment completion"
                  onChange={e => set('next_milestone', e.target.value)} />
              </div>
              <div>
                <FormLabel>Due Date</FormLabel>
                <input type="date" className={inputCls} value={form.next_due_date?.split('T')[0] ?? ''}
                  onChange={e => set('next_due_date', e.target.value)}
                  style={{ colorScheme: 'dark' }} />
              </div>
              <div>
                <FormLabel>Blockers</FormLabel>
                <input type="number" min={0} max={99} className={inputCls} value={form.blockers_count}
                  onChange={e => set('blockers_count', Number(e.target.value))} />
              </div>
            </div>
          </div>

          {/* ─ NDA Management */}
          <div>
            <SectionHeader icon="⚖️" title="NDA Entries" subtitle="One entry per vendor — Coupa contract numbers (Phase 3 gate)" />
            <NdaManager ndas={form.nda_numbers} onChange={v => set('nda_numbers', v)} />
          </div>

          {/* ─ APM / ERPA / SSP */}
          <div>
            <SectionHeader icon="🛡️" title="APM / ERPA / SSP" subtitle="Compliance IDs for Phase 6 gate — APM portal, OneTrust, ServiceNow" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <ComplianceRow label="APM" accent="#60a5fa"
                number={form.apm_number} status={form.apm_status}
                placeholder="e.g. APM0022259"
                onNumberChange={v => set('apm_number', v)}
                onStatusChange={v => set('apm_status', v)} />
              <ComplianceRow label="ERPA" accent="#ffc220"
                number={form.erpa_number} status={form.erpa_status}
                placeholder="e.g. ERPA-2026-0045"
                onNumberChange={v => set('erpa_number', v)}
                onStatusChange={v => set('erpa_status', v)} />
              <ComplianceRow label="SSP" accent="#22c55e"
                number={form.ssp_number} status={form.ssp_status}
                placeholder="e.g. SSP00012298"
                onNumberChange={v => set('ssp_number', v)}
                onStatusChange={v => set('ssp_status', v)} />
            </div>
          </div>

          {/* ─ Notes */}
          <div>
            <SectionHeader icon="📝" title="Compliance Notes" subtitle="Context, links, caveats — visible in the lifecycle timeline" />
            <textarea className={inputCls} rows={4} value={form.compliance_notes}
              placeholder="Add any notes about the compliance IDs, in-progress items, stakeholder context…"
              onChange={e => set('compliance_notes', e.target.value)}
              style={{ resize: 'vertical', fontFamily: 'inherit' }} />
            <div style={{ marginTop: 10 }}>
              <FormLabel>Last Updated By</FormLabel>
              <input className={inputCls} value={form.last_update_by} placeholder="FirstName.LastName@walmart.com"
                onChange={e => set('last_update_by', e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      {/* Sticky save bar */}
      <div style={{
        padding: '14px 24px', borderTop: '1px solid rgba(255,255,255,0.07)',
        background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', flexShrink: 0, backdropFilter: 'blur(8px)',
      }}>
        {dirty
          ? <span style={{ fontSize: 11, color: '#ffc220', fontWeight: 700 }}>● Unsaved changes</span>
          : <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>No changes</span>
        }
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => { setForm({ ...project }); setDirty(false); }}
            disabled={!dirty} style={{
              padding: '8px 18px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)',
              background: 'transparent', color: dirty ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.2)',
              cursor: dirty ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 600,
            }}>Discard</button>
          <button onClick={save} disabled={saving || !dirty} style={{
            padding: '8px 24px', borderRadius: 8, border: 'none',
            background: dirty ? '#0053e2' : 'rgba(0,83,226,0.3)',
            color: dirty ? '#fff' : 'rgba(255,255,255,0.35)',
            cursor: dirty && !saving ? 'pointer' : 'not-allowed',
            fontSize: 13, fontWeight: 700,
            boxShadow: dirty ? '0 0 20px rgba(0,83,226,0.4)' : 'none',
            transition: 'all 0.2s',
          }}>{saving ? 'Saving…' : 'Save Changes'}</button>
        </div>
      </div>

      {/* Toast */}
      <AnimatePresence>{toast && <SaveToast status={toast.status} message={toast.message} />}</AnimatePresence>
    </div>
  );
};

// ── Main export ──────────────────────────────────────────────────────────

export const ProjectAdminPanel: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selected, setSelected] = useState<Project | null>(null);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch('/api/projects');
      const data = await res.json();
      const list: Project[] = data.projects ?? [];
      setProjects(list);
      // Keep selected in sync after a save
      setSelected(s => s ? (list.find(p => p.project_id === s.project_id) ?? null) : null);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSaved = (updated: Project) => {
    setProjects(ps => ps.map(p => p.project_id === updated.project_id ? updated : p));
    setSelected(updated);
  };

  const filtered = projects.filter(p =>
    p.project_name.toLowerCase().includes(search.toLowerCase()) ||
    p.project_id.toLowerCase().includes(search.toLowerCase())
  );

  const healthColor = (h: string) =>
    h === 'green' ? '#22c55e' : h === 'yellow' ? '#ffc220' : '#ea1100';

  return (
    <div style={{ display: 'flex', height: '100%', background: 'var(--s-bg)', overflow: 'hidden' }}>

      {/* ─ Left project list */}
      <div style={{
        width: 300, flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', flexDirection: 'column', background: 'rgba(0,6,22,0.6)',
      }}>
        {/* Search */}
        <div style={{ padding: '16px 14px 10px' }}>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
              color: 'rgba(255,255,255,0.3)', fontSize: 14, pointerEvents: 'none' }}>🔍</span>
            <input
              className={inputCls}
              style={{ paddingLeft: 32 }}
              placeholder="Search projects…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 8, textAlign: 'center' }}>
            {filtered.length} / {projects.length} projects
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: 32, fontSize: 12 }}>Loading…</div>
          ) : filtered.map(p => {
            const isActive = selected?.project_id === p.project_id;
            const hc = healthColor(p.health);
            return (
              <motion.button key={p.project_id} whileHover={{ x: 2 }}
                onClick={() => setSelected(p)}
                style={{
                  width: '100%', textAlign: 'left', padding: '12px 14px',
                  background: isActive ? 'rgba(0,83,226,0.15)' : 'transparent',
                  borderLeft: `3px solid ${isActive ? '#0053e2' : 'transparent'}`,
                  border: 'none', borderLeftWidth: 3,
                  borderLeftStyle: 'solid',
                  borderLeftColor: isActive ? '#0053e2' : 'transparent',
                  cursor: 'pointer',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  transition: 'background 0.15s',
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: hc,
                    flexShrink: 0, boxShadow: `0 0 5px ${hc}` }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>
                    {p.project_name}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 6, paddingLeft: 15 }}>
                  <span style={{ fontSize: 9, fontWeight: 800, color: '#0053e2',
                    background: 'rgba(0,83,226,0.15)', padding: '1px 6px', borderRadius: 99 }}>
                    Ph.{p.est_phase_index}/8
                  </span>
                  {p.apm_number && (
                    <span style={{ fontSize: 9, fontWeight: 700, color: '#60a5fa',
                      background: 'rgba(96,165,250,0.1)', padding: '1px 6px', borderRadius: 99 }}>
                      APM
                    </span>
                  )}
                  {p.nda_numbers?.length > 0 && (
                    <span style={{ fontSize: 9, fontWeight: 700, color: '#c084fc',
                      background: 'rgba(192,132,252,0.1)', padding: '1px 6px', borderRadius: 99 }}>
                      NDA×{p.nda_numbers.length}
                    </span>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* ─ Right edit panel */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <AnimatePresence mode="wait">
          {selected ? (
            <motion.div key={selected.project_id}
              initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.2 }}
              style={{ height: '100%' }}>
              <EditForm project={selected} onSaved={handleSaved} />
            </motion.div>
          ) : (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ height: '100%', display: 'flex', alignItems: 'center',
                justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
              <span style={{ fontSize: 48 }}>📝</span>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.4)' }}>
                Select a project to edit
              </p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>
                {projects.length} projects loaded
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ProjectAdminPanel;
