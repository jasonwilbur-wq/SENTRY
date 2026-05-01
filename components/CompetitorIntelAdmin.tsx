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
import { apiFetch } from '../services/api';
import type {
  CompetitorEvent,
  CompetitorEventsListResponse,
  CompetitorEventCreate,
  CompetitorEventUpdate,
} from '../services/api';

// ── API Client Functions ──────────────────────────────────────────────────────

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
  const res = await apiFetch(`/api/admin/competitor-events?${params}`);
  if (!res.ok) throw new Error(`Failed to fetch events: ${res.statusText}`);
  return res.json();
}

async function createCompetitorEvent(event: CompetitorEventCreate): Promise<CompetitorEvent> {
  const res = await apiFetch('/api/admin/competitor-events', {
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
  const res = await apiFetch(`/api/admin/competitor-events/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(update),
  });
  if (!res.ok) throw new Error(`Failed to update event: ${res.statusText}`);
  return res.json();
}

async function deleteCompetitorEvent(id: number): Promise<void> {
  const res = await apiFetch(`/api/admin/competitor-events/${id}`, {
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
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
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

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchCompetitorEvents(page, pageSize, filters);
      setEvents(data.events);
      setTotal(data.total);
      setTotalPages(data.total_pages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load events');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filters]);

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
          className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
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
      <div className="flex gap-4 text-sm">
        <div className="px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg">
          <span className="text-slate-400">Total Events:</span>
          <span className="ml-2 font-bold text-white">{total}</span>
        </div>
        <div className="px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg">
          <span className="text-slate-400">Page:</span>
          <span className="ml-2 font-bold text-white">
            {page} / {totalPages}
          </span>
        </div>
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
