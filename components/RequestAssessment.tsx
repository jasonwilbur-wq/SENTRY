import React, { useState } from 'react';
import { submitAssessment } from '../services/api';

const RISK_CATEGORIES = [
  'Drones & C-UAS', 'Video Analytics & VMS', 'Access Control & Identity',
  'Cybersecurity & Zero Trust', 'AI & Machine Learning', 'IoT & Edge Computing',
  'Biometrics', 'Supply Chain & Logistics', 'Other',
];

const ASSESSMENT_TYPES = [
  { value: 'vendor_initial', label: 'Vendor Initial Assessment' },
  { value: 'grc_review', label: 'GRC / Compliance Review' },
  { value: 'architecture_review', label: 'Architecture Review' },
  { value: 'pen_test', label: 'Penetration Test Request' },
];

export const RequestAssessment: React.FC = () => {
  const [submitted, setSubmitted] = useState(false);
  const [refId, setRefId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    vendor_name: '', assessment_type: '', contact_name: '', contact_email: '',
    category: '', urgency: 'normal', notes: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await submitAssessment(form);
      if (res.success) {
        setRefId(res.ref_id);
        setSubmitted(true);
      } else {
        setError('Submission failed. Please try again.');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Submission failed.';
      if (msg.includes('422')) {
        setError('Validation error — please check your form fields and try again.');
      } else if (msg.includes('401') || msg.includes('403')) {
        setError('Authentication required. Please configure your identity.');
      } else {
        setError(`Submission failed: ${msg}`);
      }
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-6 animate-fadeIn">
        <div className="bg-green-900/30 border border-green-700 rounded-lg p-8 max-w-md text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-green-400 mb-2">Assessment Submitted</h2>
          <p className="text-slate-300 mb-4">Your request has been saved and is awaiting triage.</p>
          <p className="text-xs font-mono text-sentry-accent bg-slate-900 px-3 py-1 rounded border border-slate-700">Ref: {refId}</p>
          <p className="text-xs text-slate-500 mt-2">Status: SUBMITTED</p>
          <button
            onClick={() => { setSubmitted(false); setForm({ vendor_name: '', assessment_type: '', contact_name: '', contact_email: '', category: '', urgency: 'normal', notes: '' }); }}
            className="mt-6 text-sm text-slate-400 hover:text-white underline"
          >
            Submit another
          </button>
        </div>
      </div>
    );
  }

  const inputCls = 'sentry-input';

  return (
    <div className="max-w-2xl mx-auto animate-fadeIn">
      <div className="rounded-lg shadow-lg p-8" style={{ background: 'var(--s-card)', border: '1px solid var(--s-border-mid)' }}>
        <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--s-text)' }}>Security Assessment Request</h2>
        <p className="text-sm mb-6" style={{ color: 'var(--s-text-muted)' }}>Opens a SENTRY GRC workflow. Fields marked * are required.</p>

        {error && <div className="mb-4 p-3 rounded bg-red-900/30 border border-red-700 text-red-400 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="vendor_name" className="block text-sm font-medium mb-1" style={{ color: 'var(--s-text-muted)' }}>Vendor / Technology *</label>
            <input id="vendor_name" name="vendor_name" required value={form.vendor_name} onChange={handleChange} className={inputCls} placeholder="e.g. DroneShield" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor="assessment_type" className="block text-sm font-medium mb-1" style={{ color: 'var(--s-text-muted)' }}>Assessment Type *</label>
              <select id="assessment_type" name="assessment_type" required value={form.assessment_type} onChange={handleChange} className={inputCls}>
                <option value="">Select type…</option>
                {ASSESSMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="category" className="block text-sm font-medium mb-1" style={{ color: 'var(--s-text-muted)' }}>Technology Category</label>
              <select id="category" name="category" value={form.category} onChange={handleChange} className={inputCls}>
                <option value="">Select category…</option>
                {RISK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor="contact_name" className="block text-sm font-medium mb-1" style={{ color: 'var(--s-text-muted)' }}>Requestor Name *</label>
              <input id="contact_name" name="contact_name" required value={form.contact_name} onChange={handleChange} className={inputCls} placeholder="Jane Smith" />
            </div>
            <div>
              <label htmlFor="contact_email" className="block text-sm font-medium mb-1" style={{ color: 'var(--s-text-muted)' }}>Email *</label>
              <input id="contact_email" name="contact_email" type="email" required value={form.contact_email} onChange={handleChange} className={inputCls} placeholder="j.smith@walmart.com" />
            </div>
          </div>

          <div>
            <label htmlFor="urgency" className="block text-sm font-medium mb-1" style={{ color: 'var(--s-text-muted)' }}>Urgency</label>
            <select id="urgency" name="urgency" value={form.urgency} onChange={handleChange} className={inputCls}>
              <option value="low">Low — standard queue</option>
              <option value="normal">Normal — within 2 weeks</option>
              <option value="high">High — within 5 days</option>
              <option value="critical">Critical — within 24h</option>
            </select>
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium mb-1" style={{ color: 'var(--s-text-muted)' }}>Additional Context</label>
            <textarea id="notes" name="notes" rows={4} value={form.notes} onChange={handleChange} className={inputCls} placeholder="Pilot stage, business justification, existing concerns…" />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg font-bold text-white bg-wmt-blue hover:bg-wmt-yellow hover:text-wmt-void disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Submitting…' : 'Submit Assessment Request'}
          </button>
        </form>
      </div>
    </div>
  );
};