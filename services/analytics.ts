type AnalyticsMeta = Record<string, string | number | boolean | null>;

interface AnalyticsEvent {
  event_name: string;
  session_id: string;
  occurred_at: string;
  metadata: AnalyticsMeta;
}

const VITE_ENV = (import.meta as any).env ?? {};
const RAW_API_BASE = String(VITE_ENV.VITE_API_URL ?? '').trim();
const IS_LOCAL_DEV_ORIGIN = typeof window !== 'undefined'
  && ['localhost', '127.0.0.1'].includes(window.location.hostname);
const API_BASE: string = IS_LOCAL_DEV_ORIGIN ? '' : (RAW_API_BASE || '');
const SESSION_KEY = 'sentry.analytics.sessionId';
const MAX_BATCH_SIZE = 20;
const FLUSH_INTERVAL_MS = 5000;

let queue: AnalyticsEvent[] = [];
let initialized = false;
let flushTimer: number | null = null;

function generateSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function getSessionId(): string {
  try {
    const existing = window.sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const created = generateSessionId();
    window.sessionStorage.setItem(SESSION_KEY, created);
    return created;
  } catch {
    return generateSessionId();
  }
}

function normalizeMeta(meta: AnalyticsMeta): AnalyticsMeta {
  const result: AnalyticsMeta = {};
  for (const [key, value] of Object.entries(meta)) {
    if (value === undefined) continue;
    if (typeof value === 'string') {
      result[key] = value.slice(0, 300);
    } else {
      result[key] = value;
    }
  }
  return result;
}

async function postBatch(events: AnalyticsEvent[]): Promise<void> {
  const payload = JSON.stringify({ events });

  // sendBeacon for unload-path reliability; fetch fallback for normal operation.
  if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    const blob = new Blob([payload], { type: 'application/json' });
    const sent = navigator.sendBeacon(`${API_BASE}/api/analytics/events/batch`, blob);
    if (sent) return;
  }

  await fetch(`${API_BASE}/api/analytics/events/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    keepalive: true,
  });
}

async function flushQueue(): Promise<void> {
  if (!queue.length) return;

  const events = queue.slice(0, MAX_BATCH_SIZE);
  queue = queue.slice(MAX_BATCH_SIZE);

  try {
    await postBatch(events);
  } catch {
    // Requeue on transient failure (bounded growth by user session scope).
    queue = [...events, ...queue].slice(0, 200);
  }

  if (queue.length) {
    void flushQueue();
  }
}

function ensureInitialized(): void {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  flushTimer = window.setInterval(() => {
    void flushQueue();
  }, FLUSH_INTERVAL_MS);

  const flushOnExit = () => {
    void flushQueue();
  };

  window.addEventListener('beforeunload', flushOnExit);
  window.addEventListener('pagehide', flushOnExit);
}

export function trackEvent(eventName: string, metadata: AnalyticsMeta = {}): void {
  if ((import.meta as any).env?.MODE === 'test') return;

  ensureInitialized();

  queue.push({
    event_name: eventName,
    session_id: getSessionId(),
    occurred_at: new Date().toISOString(),
    metadata: normalizeMeta(metadata),
  });

  if (queue.length >= MAX_BATCH_SIZE) {
    void flushQueue();
  }
}

export function trackView(view: string): void {
  trackEvent('view_changed', { view });
}

export function shutdownAnalytics(): void {
  if (flushTimer !== null && typeof window !== 'undefined') {
    window.clearInterval(flushTimer);
    flushTimer = null;
  }
  void flushQueue();
}
