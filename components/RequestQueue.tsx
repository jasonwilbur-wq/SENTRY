/**
 * RequestQueue — Admin triage queue for service requests.
 *
 * Features:
 *   - Lists all assessment and lab-visit requests
 *   - Filter by status and request type
 *   - Expand any row to see full detail + change status
 *   - Admin-only (guarded by useAuth)
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  fetchAdminRequests,
  fetchRequestByRef,
  updateRequestStatus,
  type ServiceRequestSummary,
  type ServiceRequestDetail,
  type StatusUpdateResponse,
} from '../services/api';
import { useAuth } from '../context/AuthContext';

// ── Constants ────────────────────────────────────────────────────────────────

const STATUSES = ['SUBMITTED', 'TRIAGE_PENDING', 'IN_REVIEW', 'CLOSED'] as const;
const REQUEST_TYPES = [
  { value: 'assessment', label: 'Assessment' },
  { value: 'lab_visit', label: 'Lab Visit' },
] as const;

const STATUS_COLORS: Record<string, string> = {
  SUBMITTED:       'bg-blue-500/20 text-blue-400 border-blue-500/40',
  TRIAGE_PENDING:  'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
  IN_REVIEW:       'bg-purple-500/20 text-purple-400 border-purple-500/40',
  CLOSED:          'bg-slate-500/20 text-slate-400 border-slate-500/40',
};

const TYPE_LABELS: Record<string, string> = {
  assessment: '📋 Assessment',
  lab_visit:  '🔬 Lab Visit',
};

const URGENCY_COLORS: Record<string, string> = {
  critical: 'text-red-400',
  high:     'text-orange-400',
  normal:   'text-slate-300',
  low:      'text-slate-500',
};

// ── Sub-components ───────────────────────────────────────────────────────────

const StatusBadge: React.FC<{ status: string }> = ({ status }) => (
  <span className={`text-xs font-mono px-2 py-0.5 rounded border ${STATUS_COLORS[status] ?? 'text-slate-400'}`}>
    {status}
  </span>
);

/** Detail panel shown when a queue row is expanded. */
const RequestDetail: React.FC<{
  refId: string;
  onStatusChanged: () => void;
}> = ({ refId, onStatusChanged }) => {
  const [detail, setDetail] = useState<ServiceRequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [note, setNote] = useState('');
  const [updating, setUpdating] = useState(false);
  const [updateMsg, setUpdateMsg] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchRequestByRef(refId)
      .then(setDetail)
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [refId]);

  const handleStatusUpdate = async () => {
    if (!newStatus) return;
    setUpdating(true);
    setUpdateMsg(null);
    try {
      const res: StatusUpdateResponse = await updateRequestStatus(refId, newStatus, note);
      setUpdateMsg(`✅ ${res.old_status} → ${res.new_status}`);
      setNewStatus('');
      setNote('');
      // Refresh detail and parent list
      const updated = await fetchRequestByRef(refId);
      setDetail(updated);
      onStatusChanged();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Update failed';
      setUpdateMsg(`❌ ${msg}`);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <div className="p-4 text-sm text-slate-400">Loading…</div>;
  if (error) return <div className="p-4 text-sm text-red-400">{error}</div>;
  if (!detail) return null;

  const inputCls = 'sentry-input text-sm';

  return (
    <div className="p-4 space-y-4" style={{ background: 'var(--s-bg-subtle, #0a0f1a)' }}>
      {/* Detail fields */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
        <div>
          <span className="text-slate-500">Ref</span>
          <p className="font-mono text-sentry-accent">{detail.ref_id}</p>
        </div>
        <div>
          <span className="text-slate-500">Type</span>
          <p>{TYPE_LABELS[detail.request_type] ?? detail.request_type}</p>
        </div>
        <div>
          <span className="text-slate-500">Status</span>
          <p><StatusBadge status={detail.status} /></p>
        </div>
        <div>
          <span className="text-slate-500">Created By</span>
          <p>{detail.created_by}</p>
        </div>
        <div>
          <span className="text-slate-500">Created</span>
          <p>{new Date(detail.created_at).toLocaleString()}</p>
        </div>
        <div>
          <span className="text-slate-500">Contact</span>
          <p>{detail.contact_name}</p>
        </div>
        {detail.vendor_name && (
          <div>
            <span className="text-slate-500">Vendor</span>
            <p>{detail.vendor_name}</p>
          </div>
        )}
        {detail.assessment_type && (
          <div>
            <span className="text-slate-500">Assessment Type</span>
            <p>{detail.assessment_type}</p>
          </div>
        )}
        {detail.urgency && (
          <div>
            <span className="text-slate-500">Urgency</span>
            <p className={URGENCY_COLORS[detail.urgency] ?? ''}>{detail.urgency}</p>
          </div>
        )}
        {detail.preferred_date && (
          <div>
            <span className="text-slate-500">Date</span>
            <p>{detail.preferred_date}</p>
          </div>
        )}
        {detail.preferred_slot && (
          <div>
            <span className="text-slate-500">Time</span>
            <p>{detail.preferred_slot}</p>
          </div>
        )}
        {detail.equipment && (
          <div>
            <span className="text-slate-500">Equipment</span>
            <p>{detail.equipment}</p>
          </div>
        )}
        {detail.attendees != null && (
          <div>
            <span className="text-slate-500">Attendees</span>
            <p>{detail.attendees}</p>
          </div>
        )}
        {detail.updated_by && (
          <div>
            <span className="text-slate-500">Last Updated By</span>
            <p>{detail.updated_by}</p>
          </div>
        )}
      </div>

      {/* Notes */}
      {detail.notes && (
        <div className="text-xs">
          <span className="text-slate-500">Notes</span>
          <p className="mt-1 text-slate-300 whitespace-pre-wrap">{detail.notes}</p>
        </div>
      )}

      {/* Status note from last triage */}
      {detail.status_note && (
        <div className="text-xs">
          <span className="text-slate-500">Triage Note</span>
          <p className="mt-1 text-slate-300 italic">"{detail.status_note}"</p>
        </div>
      )}

      {/* Status transition controls */}
      {detail.status !== 'CLOSED' || true /* always show for re-open */ ? (
        <div className="border-t border-slate-700 pt-3 space-y-2">
          <p className="text-xs font-semibold text-slate-400">Update Status</p>
          <div className="flex gap-2 items-end flex-wrap">
            <select
              value={newStatus}
              onChange={e => setNewStatus(e.target.value)}
              className={`${inputCls} max-w-[200px]`}
              aria-label="New status"
            >
              <option value="">Select…</option>
              {STATUSES.filter(s => s !== detail.status).map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Note (optional)"
              value={note}
              onChange={e => setNote(e.target.value)}
              className={`${inputCls} max-w-[300px]`}
              aria-label="Status note"
            />
            <button
              onClick={handleStatusUpdate}
              disabled={!newStatus || updating}
              className="px-4 py-2 text-xs font-bold rounded bg-wmt-blue text-white
                         hover:bg-wmt-yellow hover:text-wmt-void
                         disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {updating ? 'Updating…' : 'Update'}
            </button>
          </div>
          {updateMsg && (
            <p className={`text-xs ${updateMsg.startsWith('✅') ? 'text-green-400' : 'text-red-400'}`}>
              {updateMsg}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
};


// ── Main component ───────────────────────────────────────────────────────────

export const RequestQueue: React.FC = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<ServiceRequestSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [expandedRef, setExpandedRef] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters: { status?: string; request_type?: string } = {};
      if (statusFilter) filters.status = statusFilter;
      if (typeFilter) filters.request_type = typeFilter;
      const res = await fetchAdminRequests(filters);
      setRequests(res.requests);
      setTotal(res.total);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load';
      if (msg.includes('403')) {
        setError('Admin privileges required to view the request queue.');
      } else if (msg.includes('401')) {
        setError('Authentication required.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter]);

  useEffect(() => { loadRequests(); }, [loadRequests]);

  // Guard: non-admin gets a clear message
  if (user && !user.is_admin) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20 animate-fadeIn">
        <div className="text-5xl mb-4">🔒</div>
        <h2 className="text-xl font-bold text-slate-300 mb-2">Admin Access Required</h2>
        <p className="text-sm text-slate-500">
          The request triage queue is only available to SENTRY administrators.
        </p>
      </div>
    );
  }

  const inputCls = 'sentry-input text-sm';

  return (
    <div className="max-w-5xl mx-auto animate-fadeIn">
      <div className="rounded-lg shadow-lg overflow-hidden"
           style={{ background: 'var(--s-card)', border: '1px solid var(--s-border-mid)' }}>

        {/* Header + filters */}
        <div className="p-6 border-b" style={{ borderColor: 'var(--s-border-mid)' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold" style={{ color: 'var(--s-text)' }}>
                Request Triage Queue
              </h2>
              <p className="text-xs mt-1" style={{ color: 'var(--s-text-muted)' }}>
                {total} request{total !== 1 ? 's' : ''} total
              </p>
            </div>
            <button
              onClick={loadRequests}
              disabled={loading}
              className="px-3 py-1.5 text-xs rounded border border-slate-600 text-slate-300
                         hover:bg-slate-700 disabled:opacity-40 transition-colors"
              aria-label="Refresh queue"
            >
              {loading ? '⏳' : '🔄'} Refresh
            </button>
          </div>

          <div className="flex gap-3 flex-wrap">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className={`${inputCls} max-w-[180px]`}
              aria-label="Filter by status"
            >
              <option value="">All statuses</option>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className={`${inputCls} max-w-[180px]`}
              aria-label="Filter by type"
            >
              <option value="">All types</option>
              {REQUEST_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 text-sm text-red-400 bg-red-900/20 border-b border-red-800">
            {error}
          </div>
        )}

        {/* Queue rows */}
        {loading && requests.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">Loading requests…</div>
        ) : requests.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            No requests found{statusFilter || typeFilter ? ' matching filters' : ''}.
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--s-border-mid)' }}>
            {requests.map(req => (
              <div key={req.ref_id}>
                {/* Summary row */}
                <button
                  onClick={() => setExpandedRef(expandedRef === req.ref_id ? null : req.ref_id)}
                  className="w-full text-left px-6 py-3 flex items-center gap-4 hover:bg-slate-800/50 transition-colors"
                  aria-expanded={expandedRef === req.ref_id}
                  aria-label={`Request ${req.ref_id}`}
                >
                  <span className="text-xs w-5 text-slate-500 shrink-0">
                    {expandedRef === req.ref_id ? '▼' : '▶'}
                  </span>
                  <span className="font-mono text-xs text-sentry-accent w-[160px] shrink-0 truncate">
                    {req.ref_id}
                  </span>
                  <span className="text-xs w-[100px] shrink-0">
                    {TYPE_LABELS[req.request_type] ?? req.request_type}
                  </span>
                  <span className="w-[130px] shrink-0">
                    <StatusBadge status={req.status} />
                  </span>
                  <span className="text-xs text-slate-300 flex-1 truncate">
                    {req.contact_name}
                    {req.vendor_name ? ` — ${req.vendor_name}` : ''}
                  </span>
                  {req.urgency && req.urgency !== 'normal' && (
                    <span className={`text-xs font-bold uppercase ${URGENCY_COLORS[req.urgency] ?? ''}`}>
                      {req.urgency}
                    </span>
                  )}
                  <span className="text-xs text-slate-500 w-[140px] shrink-0 text-right">
                    {new Date(req.created_at).toLocaleDateString()}
                  </span>
                </button>

                {/* Expanded detail */}
                {expandedRef === req.ref_id && (
                  <RequestDetail refId={req.ref_id} onStatusChanged={loadRequests} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
