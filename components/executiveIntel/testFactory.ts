import { ExecutiveSignalRecord } from '../../services/executiveIntelApi';

// Minimal factory for ExecutiveSignalRecord so tests stay readable and DRY.
// Override only the fields a given test cares about.
export function makeSignal(overrides: Partial<ExecutiveSignalRecord> = {}): ExecutiveSignalRecord {
  return {
    signal_id: overrides.signal_id ?? 'sig_test',
    category: overrides.category ?? 'INITIATIVE',
    event_date: overrides.event_date,
    event_location: overrides.event_location,
    title: overrides.title ?? 'Test signal title',
    summary: overrides.summary ?? 'Test signal summary.',
    business_relevance: overrides.business_relevance ?? '',
    walmart_cso_relevance: overrides.walmart_cso_relevance ?? '',
    confidence_level: overrides.confidence_level ?? 'MEDIUM_REPUTABLE_SECONDARY',
    verification_status: overrides.verification_status ?? 'VERIFIED',
    analyst_review_status: overrides.analyst_review_status ?? 'READY_FOR_REVIEW',
    sensitivity_level: overrides.sensitivity_level ?? 'PUBLIC_BUSINESS',
    citations: overrides.citations ?? [],
    _artifact_file: overrides._artifact_file,
  };
}

// ISO date string N days before a fixed "now" (used with fake timers).
export function daysAgoIso(days: number, from: number): string {
  return new Date(from - days * 86_400_000).toISOString();
}
