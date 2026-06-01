/**
 * Central SENTRY Atlas design tokens.
 *
 * Keep brand/semantic color decisions here first, then mirror durable values in
 * styles.css CSS variables for non-TypeScript styling. This prevents the UI
 * from drifting back into generic purple/cyan AI-dashboard accents.
 */
export const ATLAS_COLORS = {
  ink: '#050A18',
  graphite: '#111827',
  steel: '#7893B8',
  mist: '#D9E3F0',
  walmartBlue: '#0053E2',
  walmartNavy: '#001E60',
  spark: '#FFC220',
  secure: '#2A8703',
  alert: '#D95F02',
  critical: '#C62828',
} as const;

export const ATLAS_STATUS_COLORS = {
  low: ATLAS_COLORS.secure,
  medium: ATLAS_COLORS.spark,
  high: ATLAS_COLORS.alert,
  critical: ATLAS_COLORS.critical,
  neutral: ATLAS_COLORS.steel,
} as const;

export const ATLAS_CATEGORY_COLORS = {
  vendor: ATLAS_COLORS.walmartBlue,
  competitor: ATLAS_COLORS.alert,
  regulatory: ATLAS_COLORS.steel,
  incident: ATLAS_COLORS.critical,
  project: ATLAS_COLORS.spark,
  admin: ATLAS_COLORS.graphite,
} as const;
