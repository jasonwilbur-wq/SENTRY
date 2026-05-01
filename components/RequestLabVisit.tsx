import React, { useState } from 'react';
import { submitLabVisit } from '../services/api';

const LAB_EQUIPMENT = [
  'DroneShield RFOne', 'Skydio X10D', 'Sunflower Labs Hive',
  'Axon Fleet 3', 'Verkada Dome Camera', 'Lenel S2 NetBox',
  'Custom (specify in notes)',
];

const TIME_SLOTS = [
  '9:00 AM – 11:00 AM', '11:00 AM – 1:00 PM',
  '1:00 PM – 3:00 PM', '3:00 PM – 5:00 PM',
];

export const RequestLabVisit: React.FC = () => {
  const [submitted, setSubmitted] = useState(false);
  const [refId, setRefId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    contact_name: '', contact_email: '', preferred_date: '',
    preferred_slot: '', equipment: '', attendees: '1', notes: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await submitLabVisit(form);
      if (res.success) {
        setRefId(res.ref_id);
        setSubmitted(true);
      } else {
        setError('Submission failed. Please try again.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Submission failed. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-6 animate-fadeIn">
        <div className="bg-green-900/30 border border-green-700 rounded-lg p-8 max-w-md text-center">
          <div className="text-5xl mb-4">🔬</div>
          <h2 className="text-2xl font-bold text-green-400 mb-2">Lab Visit Requested</h2>
          <p className="text-slate-300 mb-4">The Emerging Technology Lab team will confirm within 48h.</p>
          <p className="text-xs font-mono text-sentry-accent bg-slate-900 px-3 py-1 rounded border border-slate-700">Ref: {refId}</p>
          <p className="mt-3 text-xs text-slate-400">Status: <span className="font-semibold text-blue-300">SUBMITTED</span></p>
          <button
            onClick={() => { setSubmitted(false); setForm({ contact_name: '', contact_email: '', preferred_date: '', preferred_slot: '', equipment: '', attendees: '1', notes: '' }); }}
            className="mt-6 text-sm text-slate-400 hover:text-white underline"
          >
            Submit another
          </button>
        </div>
      </div>
    );
  }

  const inputCls = 'w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-sentry-accent focus:ring-1 focus:ring-sentry-accent';

  return (
    <div className="max-w-2xl mx-auto animate-fadeIn">
      <div className="bg-sentry-card rounded-lg border border-slate-700 shadow-lg p-8">
        <h2 className="text-2xl font-bold text-white mb-1">Emerging Technology Lab</h2>
        <p className="text-slate-400 text-sm mb-6">Schedule a hands-on evaluation session with hardware in the secure lab.</p>

        {error && <div className="mb-4 p-3 rounded bg-red-900/30 border border-red-700 text-red-400 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor="contact_name" className="block text-sm font-medium text-slate-300 mb-1">Your Name *</label>
              <input id="contact_name" name="contact_name" required value={form.contact_name} onChange={handleChange} className={inputCls} placeholder="Jane Smith" />
            </div>
            <div>
              <label htmlFor="contact_email" className="block text-sm font-medium text-slate-300 mb-1">Email *</label>
              <input id="contact_email" name="contact_email" type="email" required value={form.contact_email} onChange={handleChange} className={inputCls} placeholder="j.smith@walmart.com" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor="preferred_date" className="block text-sm font-medium text-slate-300 mb-1">Preferred Date *</label>
              <input id="preferred_date" name="preferred_date" type="date" required value={form.preferred_date} onChange={handleChange} className={inputCls} />
            </div>
            <div>
              <label htmlFor="preferred_slot" className="block text-sm font-medium text-slate-300 mb-1">Time Slot *</label>
              <select id="preferred_slot" name="preferred_slot" required value={form.preferred_slot} onChange={handleChange} className={inputCls}>
                <option value="">Select slot…</option>
                {TIME_SLOTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="equipment" className="block text-sm font-medium text-slate-300 mb-1">Equipment of Interest</label>
            <select id="equipment" name="equipment" value={form.equipment} onChange={handleChange} className={inputCls}>
              <option value="">Select equipment…</option>
              {LAB_EQUIPMENT.map(eq => <option key={eq} value={eq}>{eq}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="attendees" className="block text-sm font-medium text-slate-300 mb-1">Number of Attendees</label>
            <input id="attendees" name="attendees" type="number" min="1" max="10" value={form.attendees} onChange={handleChange} className={inputCls} />
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-slate-300 mb-1">Evaluation Goals / Notes</label>
            <textarea id="notes" name="notes" rows={4} value={form.notes} onChange={handleChange} className={inputCls} placeholder="What are you trying to evaluate? What decision are you trying to make?" />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg font-bold text-white bg-wmt-blue hover:bg-wmt-yellow hover:text-wmt-void disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Submitting…' : 'Request Lab Visit'}
          </button>
        </form>
      </div>
    </div>
  );
};