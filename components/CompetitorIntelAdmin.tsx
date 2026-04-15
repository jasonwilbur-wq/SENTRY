/**
 * CompetitorIntelAdmin - Admin interface for managing competitor intel events.
 *
 * Features:
 * - List/filter/search competitor events
 * - Create new events
 * - Edit existing events
 * - Delete events
 * - Pagination
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  backfillCompetitorBriefReadiness,
  fetchAdminCompetitorScoringSummary,
  fetchAdminCompetitorTriageQueue,
  rescoreCompetitorEvents,
  triageAdminCompetitorEvent,
} from '../services/api';
import type {
  CompetitorEvent,
  CompetitorEventsListResponse,
  CompetitorEventCreate,
  CompetitorEventUpdate,
  CompetitorScoringSummary,
  CompetitorTriageStatus,
} from '../services/api';

const READY_TEXT = '#2a8703';
const NOT_READY_TEXT = '#995213';

const formatReadinessField = (value: string): string => value
  .replace(/_or_/g, ' / ')
  .replace(/_/g, ' ');

const ReadinessBadge = ({ event }: { event: CompetitorEvent }) => (
  <div className="text-xs" style={{ color: event.is_brief_ready ? READY_TEXT : NOT_READY_TEXT }}>
    Brief readiness: {event.is_brief_ready ? 'READY' : 'NOT READY'}
  </div>
);

const ReadinessDetails = ({ event }: { event: CompetitorEvent }) => {
  const missingFields = event.readiness_issues || [];
  const warnings = event.readiness_warnings || [];
  const requiredFields = event.readiness_required_fields || [];

  return (
    <>
      <ReadinessBadge event={event} />
      {!!missingFields.length && (
        <div className="text-orange-300">
          Missing: {missingFields.join(', ')}
        </div>
      )}
      {!event.is_brief_ready && !!requiredFields.length && (
        <div className="text-slate-500">
          Required for ready: {requiredFields.map(formatReadinessField).join(', ')}
        </div>
      )}
      {!!warnings.length && (
        <div className="text-slate-500">Warnings: {warnings.join(', ')}</div>
      )}
    </>
  );
};

const summarizeCorrelation = (event: CompetitorEvent): string => {
  if (event.correlation_status === 'MATCHED') {
    const vendor = event.matched_vendor_name || 'tracked vendor';
    const projectCount = event.linked_active_projects_count || 0;
    return `MATCHED: ${vendor} · ${projectCount} active project(s)`;
  }
  if (event.correlation_status === 'AMBIGUOUS') {
    const candidates = (event.candidate_vendor_names || []).slice(0, 3).join(', ');
    return candidates
      ? `AMBIGUOUS: ${candidates}`
      : 'AMBIGUOUS: analyst review required';
  }
  return 'NO_MATCH: no deterministic vendor linkage';
};

// ── API Client Functions ──────────────────────────────────────────────────────

// Use relative path → Vite proxy forwards /api/* to :8082.
const API_BASE = '/api/admin';

async function fetchCompetitorEvents(
  page: number,
  pageSize: number,
  filters: { competitor?: string; category?: string; month?: string; q?: string }
): Promise<CompetitorEventsListResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    page_size: pageSize.toString(),
    ...filters,
  });
  const res = await fetch(`${API_BASE}/competitor-events?${params}`);
  if (!res.ok) throw new Error(`Failed to fetch events: ${res.statusText}`);
  return res.json();
}

async function createCompetitorEvent(event: CompetitorEventCreate): Promise<CompetitorEvent> {
  const res = await fetch(`${API_BASE}/competitor-events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  });
  if (!res.ok) throw new Error(`Failed to create event: ${res.statusText}`);
  return res.json();
}

async function updateCompetitorEvent(
  id: number,
  update: CompetitorEventUpdate
): Promise<CompetitorEvent> {
  const res = await fetch(`${API_BASE}/competitor-events/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(update),
  });
  if (!res.ok) throw new Error(`Failed to update event: ${res.statusText}`);
  return res.json();
}

async function deleteCompetitorEvent(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/competitor-events/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`Failed to delete event: ${res.statusText}`);
}

// ── Components ─────────────────────────────────────────────────────────────────

function EventFormModal({
  event,
  onClose,
  onSave,
}: {
  event?: CompetitorEvent;
  onClose: () => void;
  onSave: () => void;
}) {
  const [formData, setFormData] = useState<CompetitorEventCreate>({
    event_date: event?.event_date || new Date().toISOString().split('T')[0],
    competitor: event?.competitor || '',
    event_title: event?.event_title || '',
    event_type: event?.event_type || '',
    detailed_description: event?.detailed_description || '',
    category: event?.category || 'Other',
    location: event?.location || '',
    security_implication: event?.security_implication || '',
    operational_impact: event?.operational_impact || '',
    financial_impact: event?.financial_impact || '',
    reputational_impact: event?.reputational_impact || '',
    source_link: event?.source_link || '',
    analyst_notes: event?.analyst_notes || '',
    source_month: event?.source_month || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      if (event) {
        await updateCompetitorEvent(event.id, formData);
      } else {
        await createCompetitorEvent(formData);
      }
      onSave();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save event');
    } finally {
      setSaving(false);
    }
  };

  const categories = [
    'Cyber',
    'ORC/Theft',
    'Recall',
    'Legal',
    'Strategic',
    'Data Breach',
    'Violence',
    'Other',
  ];

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-black text-white">
            {event ? 'Edit Event' : 'Create New Event'}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/20 border border-red-700 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Event Date */}
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Event Date</label>
              <input
                type="date"
                value={formData.event_date}
                onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                required
              />
            </div>

            {/* Competitor */}
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Competitor *</label>
              <input
                type="text"
                value={formData.competitor}
                onChange={(e) => setFormData({ ...formData, competitor: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                placeholder="Amazon, Target, etc."
                required
              />
            </div>
          </div>

          {/* Event Title */}
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">Event Title *</label>
            <input
              type="text"
              value={formData.event_title}
              onChange={(e) => setFormData({ ...formData, event_title: e.target.value })}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
              placeholder="Brief title of the event"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Category */}
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Category *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full sentry-select text-sm"
                required
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Location */}
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                placeholder="City, State or Region"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">
              Detailed Description
            </label>
            <textarea
              value={formData.detailed_description}
              onChange={(e) =>
                setFormData({ ...formData, detailed_description: e.target.value })
              }
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
              rows={3}
              placeholder="Full description of the event"
            />
          </div>

          {/* Impacts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">
                Security Implication
              </label>
              <input
                type="text"
                value={formData.security_implication}
                onChange={(e) =>
                  setFormData({ ...formData, security_implication: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">
                Operational Impact
              </label>
              <input
                type="text"
                value={formData.operational_impact}
                onChange={(e) =>
                  setFormData({ ...formData, operational_impact: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">
                Financial Impact
              </label>
              <input
                type="text"
                value={formData.financial_impact}
                onChange={(e) =>
                  setFormData({ ...formData, financial_impact: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
              />
            </div>
          </div>

          {/* Source & Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Source Link</label>
              <input
                type="url"
                value={formData.source_link}
                onChange={(e) => setFormData({ ...formData, source_link: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Analyst Notes</label>
              <input
                type="text"
                value={formData.analyst_notes}
                onChange={(e) => setFormData({ ...formData, analyst_notes: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 justify-end pt-4 border-t border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold disabled:opacity-50"
            >
              {saving ? 'Saving...' : event ? 'Update Event' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function CompetitorIntelAdmin() {
  const [events, setEvents] = useState<CompetitorEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<{
    competitor?: string;
    category?: string;
    month?: string;
    q?: string;
  }>({});
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CompetitorEvent | undefined>();
  const [error, setError] = useState('');
  const [summary, setSummary] = useState<CompetitorScoringSummary | null>(null);
  const [rescoring, setRescoring] = useState(false);
  const [rescoreResult, setRescoreResult] = useState<{
    updated: number;
    skipped_manual: number;
    enrichment_field_updates: number;
    promoted: Array<{ id: number; competitor: string; event_title: string; from_tier: string; to_tier: string; score: number }>;
  } | null>(null);
  const [backfillingReadiness, setBackfillingReadiness] = useState(false);
  const [readinessBackfill, setReadinessBackfill] = useState<{
    updated_rows: number;
    field_updates: number;
    brief_ready_before: number;
    brief_ready_after: number;
    brief_ready_delta: number;
    field_coverage_before: Record<string, number>;
    field_coverage_after: Record<string, number>;
    skipped_rows: number;
    skipped_reasons: Record<string, number>;
  } | null>(null);
  const [triageQueue, setTriageQueue] = useState<CompetitorEvent[]>([]);
  const [triageStatusFilter, setTriageStatusFilter] = useState<CompetitorTriageStatus | ''>('UNREVIEWED');
  const [triageTierFilter, setTriageTierFilter] = useState<string>('');
  const [triageNotes, setTriageNotes] = useState<Record<number, string>>({});
  const [triageBusyId, setTriageBusyId] = useState<number | null>(null);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [data, scoreSummary, triageData] = await Promise.all([
        fetchCompetitorEvents(page, pageSize, filters),
        fetchAdminCompetitorScoringSummary(),
        fetchAdminCompetitorTriageQueue({
          triage_status: triageStatusFilter || undefined,
          priority_tier: triageTierFilter || undefined,
          limit: 50,
        }),
      ]);
      setEvents(data.events);
      setTotal(data.total);
      setTotalPages(data.total_pages);
      setSummary(scoreSummary);
      setTriageQueue(triageData.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load events');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filters, triageStatusFilter, triageTierFilter]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const handleCreate = () => {
    setEditingEvent(undefined);
    setShowForm(true);
  };

  const handleEdit = (event: CompetitorEvent) => {
    setEditingEvent(event);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    try {
      await deleteCompetitorEvent(id);
      await loadEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete event');
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingEvent(undefined);
  };

  const handleFormSave = async () => {
    await loadEvents();
  };

  const handleSearch = (q: string) => {
    setFilters({ ...filters, q });
    setPage(1);
  };

  const handleBackfillUnscored = async () => {
    setRescoring(true);
    setError('');
    try {
      const result = await rescoreCompetitorEvents({
        limit: 2000,
        only_unscored: true,
        preserve_manual: true,
      });
      setRescoreResult({
        updated: result.updated,
        skipped_manual: result.skipped_manual,
        enrichment_field_updates: result.enrichment_field_updates,
        promoted: result.promoted,
      });
      await loadEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Backfill failed');
    } finally {
      setRescoring(false);
    }
  };

  const handleBackfillBriefReadiness = async () => {
    setBackfillingReadiness(true);
    setError('');
    try {
      const result = await backfillCompetitorBriefReadiness({ limit: 3000, only_missing: true });
      setReadinessBackfill({
        updated_rows: result.updated_rows,
        field_updates: result.field_updates,
        brief_ready_before: result.brief_ready_before,
        brief_ready_after: result.brief_ready_after,
        brief_ready_delta: result.brief_ready_delta,
        field_coverage_before: result.field_coverage_before,
        field_coverage_after: result.field_coverage_after,
        skipped_rows: result.skipped_rows,
        skipped_reasons: result.skipped_reasons,
      });
      await loadEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Brief-readiness backfill failed');
    } finally {
      setBackfillingReadiness(false);
    }
  };

  const handleTriageAction = async (
    eventId: number,
    triageStatus: CompetitorTriageStatus,
  ) => {
    setTriageBusyId(eventId);
    setError('');
    try {
      await triageAdminCompetitorEvent(eventId, triageStatus, triageNotes[eventId] || '');
      setTriageNotes((prev) => ({ ...prev, [eventId]: '' }));
      await loadEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update triage status');
    } finally {
      setTriageBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-white">Competitor Intel Management</h2>
          <p className="text-sm text-slate-400 mt-1">
            Manage competitor events and intelligence data
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold flex items-center gap-2"
        >
          <span>+</span>
          Create Event
        </button>
      </div>

      {/* Filters & Search */}
      <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search events..."
          value={filters.q || ''}
          onChange={(e) => handleSearch(e.target.value)}
          className="flex-1 min-w-[200px] px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
        />
        <select
          value={filters.category || ''}
          onChange={(e) => {
            setFilters({ ...filters, category: e.target.value || undefined });
            setPage(1);
          }}
          className="sentry-select text-sm"
        >
          <option value="">All Categories</option>
          <option value="Cyber">Cyber</option>
          <option value="ORC/Theft">ORC/Theft</option>
          <option value="Recall">Recall</option>
          <option value="Legal">Legal</option>
          <option value="Strategic">Strategic</option>
          <option value="Data Breach">Data Breach</option>
          <option value="Violence">Violence</option>
          <option value="Other">Other</option>
        </select>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-900/20 border border-red-700 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
        <div className="px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg">
          <span className="text-slate-400">Total Events:</span>
          <span className="ml-2 font-bold text-white">{total}</span>
        </div>
        <div className="px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg">
          <span className="text-slate-400">Page:</span>
          <span className="ml-2 font-bold text-white">{page} / {totalPages}</span>
        </div>
        <div className="px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg">
          <span className="text-slate-400">Avg Relevance:</span>
          <span className="ml-2 font-bold text-white">{summary?.avg_score ?? '—'}</span>
        </div>
      </div>

      {summary && (
        <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-bold">Scoring Visibility</h3>
            <div className="flex gap-2">
              <button
                onClick={handleBackfillUnscored}
                disabled={rescoring}
                className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-xs font-semibold text-white"
              >
                {rescoring ? 'Backfilling...' : 'Backfill Unscored'}
              </button>
              <button
                onClick={handleBackfillBriefReadiness}
                disabled={backfillingReadiness}
                className="px-3 py-1.5 rounded border text-xs font-semibold"
                style={{ borderColor: '#0053e2', color: '#93c5fd' }}
              >
                {backfillingReadiness ? 'Improving readiness...' : 'Backfill Brief Readiness'}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
            <div className="p-2 rounded bg-slate-800 border border-slate-700 text-slate-300">Unscored: <span className="font-bold text-yellow-300">{summary.distribution.unscored}</span></div>
            <div className="p-2 rounded bg-slate-800 border border-slate-700 text-slate-300">Low Signal: <span className="font-bold">{summary.distribution.archive_low_signal}</span></div>
            <div className="p-2 rounded bg-slate-800 border border-slate-700 text-slate-300">Analyst Follow-up: <span className="font-bold text-blue-300">{summary.distribution.analyst_follow_up}</span></div>
            <div className="p-2 rounded bg-slate-800 border border-slate-700 text-slate-300">Leadership Watch: <span className="font-bold text-purple-300">{summary.distribution.leadership_watch}</span></div>
            <div className="p-2 rounded bg-slate-800 border border-slate-700 text-slate-300">CSO Brief: <span className="font-bold text-red-300">{summary.distribution.cso_brief}</span></div>
          </div>
          {rescoreResult && (
            <div className="mt-3 text-xs text-slate-300 space-y-1">
              <p>Backfill updated <span className="font-bold text-white">{rescoreResult.updated}</span> events, skipped manual-tagged <span className="font-bold text-white">{rescoreResult.skipped_manual}</span>, enrichment writes <span className="font-bold text-white">{rescoreResult.enrichment_field_updates}</span>.</p>
              {rescoreResult.promoted.length > 0 && (
                <p className="text-green-300">Promoted to higher tiers: {rescoreResult.promoted.slice(0, 3).map(p => `${p.competitor} (${p.to_tier})`).join(', ')}</p>
              )}
            </div>
          )}
          {readinessBackfill && (
            <div className="mt-3 text-xs text-slate-300 space-y-1">
              <div>
                Brief-readiness backfill updated <span className="font-bold text-white">{readinessBackfill.updated_rows}</span> rows
                ({readinessBackfill.field_updates} field writes). Ready count moved from <span className="font-bold text-white">{readinessBackfill.brief_ready_before}</span> to <span className="font-bold text-white">{readinessBackfill.brief_ready_after}</span>
                (<span className={readinessBackfill.brief_ready_delta >= 0 ? 'text-green-300' : 'text-red-300'}>{readinessBackfill.brief_ready_delta >= 0 ? '+' : ''}{readinessBackfill.brief_ready_delta}</span>).
              </div>
              <div>
                Skipped rows: <span className="font-bold text-white">{readinessBackfill.skipped_rows}</span>
                {Object.keys(readinessBackfill.skipped_reasons).length > 0 && (
                  <span> · reasons: {Object.entries(readinessBackfill.skipped_reasons).map(([reason, count]) => `${reason} (${count})`).join(', ')}</span>
                )}
              </div>
              <div>
                Coverage after backfill: {Object.entries(readinessBackfill.field_coverage_after).map(([field, count]) => `${formatReadinessField(field)} ${count}`).join(' · ')}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Triage Queue */}
      <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-bold">Analyst Triage Queue</h3>
          <div className="text-xs text-slate-400">{triageQueue.length} events in queue</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={triageStatusFilter}
            onChange={(e) => setTriageStatusFilter(e.target.value as CompetitorTriageStatus | '')}
            className="sentry-select text-xs"
          >
            <option value="">All Statuses</option>
            <option value="UNREVIEWED">UNREVIEWED</option>
            <option value="REVIEWED">REVIEWED</option>
            <option value="DISMISSED">DISMISSED</option>
            <option value="ESCALATED">ESCALATED</option>
          </select>
          <select
            value={triageTierFilter}
            onChange={(e) => setTriageTierFilter(e.target.value)}
            className="sentry-select text-xs"
          >
            <option value="">Watch + CSO default</option>
            <option value="Leadership Watch">Leadership Watch</option>
            <option value="CSO Brief">CSO Brief</option>
            <option value="Analyst Follow-up">Analyst Follow-up</option>
          </select>
          <button
            onClick={loadEvents}
            className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-xs font-semibold text-white"
          >
            Refresh Queue
          </button>
        </div>

        {triageQueue.length === 0 ? (
          <div className="text-xs text-slate-400 py-2">No triage items for current filters.</div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {triageQueue.map((event) => (
              <div key={event.id} className="p-3 rounded border border-slate-700 bg-slate-800/50">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-white text-sm font-semibold">{event.competitor} — {event.event_title || 'Untitled event'}</div>
                    <div className="text-xs text-slate-400 mt-1">
                      {event.walmart_relevance_score ?? '—'} · {event.priority_tier || 'Unscored'} · triage: {event.triage_status || 'UNREVIEWED'}
                    </div>
                    <div className="text-xs text-blue-300 mt-1">
                      {summarizeCorrelation(event)}
                    </div>
                    <div className="mt-1 text-xs space-y-0.5">
                      <ReadinessDetails event={event} />
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 text-right">
                    <div>{event.triaged_by || '—'}</div>
                    <div>{event.triaged_at || '—'}</div>
                  </div>
                </div>
                <textarea
                  value={triageNotes[event.id] ?? ''}
                  onChange={(e) => setTriageNotes((prev) => ({ ...prev, [event.id]: e.target.value }))}
                  rows={2}
                  placeholder="Triage note (optional but recommended)"
                  className="mt-2 w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white"
                />
                <div className="mt-2 flex gap-2">
                  <button
                    disabled={triageBusyId === event.id}
                    onClick={() => handleTriageAction(event.id, 'REVIEWED')}
                    className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-xs font-semibold text-white"
                  >Review</button>
                  <button
                    disabled={triageBusyId === event.id}
                    onClick={() => handleTriageAction(event.id, 'DISMISSED')}
                    className="px-2 py-1 rounded bg-slate-600 hover:bg-slate-500 disabled:opacity-50 text-xs font-semibold text-white"
                  >Dismiss</button>
                  <button
                    disabled={triageBusyId === event.id}
                    onClick={() => handleTriageAction(event.id, 'ESCALATED')}
                    className="px-2 py-1 rounded bg-red-700 hover:bg-red-800 disabled:opacity-50 text-xs font-semibold text-white"
                  >Escalate</button>
                </div>
                {event.triage_note && (
                  <div className="text-xs text-slate-400 mt-2">Last note: {event.triage_note}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Events Table */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading events...</div>
      ) : events.length === 0 ? (
        <div className="text-center py-12 text-slate-400">No events found</div>
      ) : (
        <div className="bg-slate-900/50 border border-slate-700 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-800/50 border-b border-slate-700">
                <tr>
                  <th className="text-left p-3 font-bold text-slate-300">Date</th>
                  <th className="text-left p-3 font-bold text-slate-300">Competitor</th>
                  <th className="text-left p-3 font-bold text-slate-300">Title</th>
                  <th className="text-left p-3 font-bold text-slate-300">Category</th>
                  <th className="text-left p-3 font-bold text-slate-300">Score/Tier</th>
                  <th className="text-left p-3 font-bold text-slate-300">Location</th>
                  <th className="text-right p-3 font-bold text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {events.map((event) => (
                  <tr
                    key={event.id}
                    className="hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="p-3 text-slate-400">
                      {event.event_date || '—'}
                    </td>
                    <td className="p-3 text-white font-semibold">
                      {event.competitor}
                    </td>
                    <td className="p-3 text-slate-300">
                      {event.event_title || '—'}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 bg-blue-900/40 text-blue-300 rounded text-xs font-semibold">
                        {event.category}
                      </span>
                    </td>
                    <td className="p-3 text-slate-300 text-xs">
                      <div className="font-semibold text-white">{event.walmart_relevance_score ?? '—'} · {event.priority_tier || 'Unscored'}</div>
                      <div className="text-slate-400">{event.signal_type || '—'} {event.escalate_to_cso ? '· CSO candidate' : ''}</div>
                      <div className="text-slate-400">Triage: {event.triage_status || 'UNREVIEWED'}</div>
                      <div className="text-blue-300">{summarizeCorrelation(event)}</div>
                      <div className="mt-1 space-y-0.5">
                        <ReadinessDetails event={event} />
                      </div>
                      {event.match_confidence !== undefined && event.match_confidence !== null && (
                        <div className="text-slate-500">Match confidence: {Math.round((event.match_confidence || 0) * 100)}%</div>
                      )}
                      {event.score_reason && <div className="text-slate-500 mt-1" title={event.score_reason}>{event.score_reason.slice(0, 72)}...</div>}
                    </td>
                    <td className="p-3 text-slate-400">
                      {event.location || '—'}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEdit(event)}
                          className="px-3 py-1 bg-slate-700 text-slate-300 rounded hover:bg-slate-600 transition-colors text-xs font-semibold"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(event.id)}
                          className="px-3 py-1 bg-red-900/30 text-red-400 rounded hover:bg-red-900/50 transition-colors text-xs font-semibold"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors disabled:opacity-40 text-sm font-semibold"
          >
            Previous
          </button>
          <span className="text-sm text-slate-400">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors disabled:opacity-40 text-sm font-semibold"
          >
            Next
          </button>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <EventFormModal
          event={editingEvent}
          onClose={handleFormClose}
          onSave={handleFormSave}
        />
      )}
    </div>
  );
}
