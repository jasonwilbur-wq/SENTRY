/**
 * regulatoryGeoData.ts — Jurisdiction → geographic coordinate mapping.
 *
 * Every jurisdiction from the regulatory briefing is mapped here.
 * Coordinates are [latitude, longitude].  US states include a `usState`
 * two-letter code for the US-focused view.
 *
 * This is a STATIC lookup — the dynamic obligation counts/RAG data
 * come from the /api/regulatory/geo endpoint at runtime.
 */

export interface JurisdictionCoord {
  lat: number;
  lon: number;
  /** Two-letter state code (US states only) */
  usState?: string;
  /** Display label (shorter than the raw jurisdiction string) */
  label: string;
  /** Region grouping for arcs/clustering */
  region: 'us-federal' | 'us-state' | 'us-city' | 'europe' | 'asia' | 'americas' | 'global';
}

/**
 * Map from raw jurisdiction string → coordinate + metadata.
 * Keys MUST match the jurisdiction strings from regulatory-briefing.json exactly.
 */
export const JURISDICTION_COORDS: Record<string, JurisdictionCoord> = {
  // ── US Federal ────────────────────────────────────────────────────
  'United States (Federal)': { lat: 38.9, lon: -77.0, label: 'US Federal', region: 'us-federal' },

  // ── US States ─────────────────────────────────────────────────────
  'New York, USA':       { lat: 42.7, lon: -75.5, usState: 'NY', label: 'New York',       region: 'us-state' },
  'Washington, USA':     { lat: 47.4, lon: -120.5, usState: 'WA', label: 'Washington',    region: 'us-state' },
  'California, USA':     { lat: 36.8, lon: -119.4, usState: 'CA', label: 'California',    region: 'us-state' },
  'Connecticut, USA':    { lat: 41.6, lon: -72.7, usState: 'CT', label: 'Connecticut',    region: 'us-state' },
  'Virginia, USA':       { lat: 37.5, lon: -78.9, usState: 'VA', label: 'Virginia',       region: 'us-state' },
  'Colorado, USA':       { lat: 39.0, lon: -105.5, usState: 'CO', label: 'Colorado',      region: 'us-state' },
  'Maine, USA':          { lat: 45.3, lon: -69.0, usState: 'ME', label: 'Maine',          region: 'us-state' },
  'Illinois, USA':       { lat: 40.0, lon: -89.4, usState: 'IL', label: 'Illinois',       region: 'us-state' },
  'New Mexico, USA':     { lat: 34.5, lon: -106.0, usState: 'NM', label: 'New Mexico',    region: 'us-state' },
  'Florida, USA':        { lat: 28.5, lon: -82.5, usState: 'FL', label: 'Florida',        region: 'us-state' },
  'Texas, USA':          { lat: 31.0, lon: -99.5, usState: 'TX', label: 'Texas',          region: 'us-state' },
  'Maryland, USA':       { lat: 39.0, lon: -76.8, usState: 'MD', label: 'Maryland',       region: 'us-state' },
  'Arizona, USA':        { lat: 34.3, lon: -111.7, usState: 'AZ', label: 'Arizona',       region: 'us-state' },
  'Michigan, USA':       { lat: 44.3, lon: -85.6, usState: 'MI', label: 'Michigan',       region: 'us-state' },
  'Tennessee, USA':      { lat: 35.8, lon: -86.4, usState: 'TN', label: 'Tennessee',      region: 'us-state' },
  'Oklahoma, USA':       { lat: 35.5, lon: -97.5, usState: 'OK', label: 'Oklahoma',       region: 'us-state' },
  'Utah, USA':           { lat: 39.3, lon: -111.7, usState: 'UT', label: 'Utah',          region: 'us-state' },
  'Minnesota, USA':      { lat: 46.3, lon: -94.3, usState: 'MN', label: 'Minnesota',      region: 'us-state' },
  'Montana, USA':        { lat: 47.0, lon: -110.0, usState: 'MT', label: 'Montana',       region: 'us-state' },
  'Kentucky, USA':       { lat: 37.8, lon: -85.8, usState: 'KY', label: 'Kentucky',       region: 'us-state' },
  'Oregon, USA':         { lat: 44.0, lon: -120.5, usState: 'OR', label: 'Oregon',        region: 'us-state' },
  'Georgia, USA':        { lat: 33.0, lon: -83.5, usState: 'GA', label: 'Georgia',        region: 'us-state' },
  'Indiana, USA':        { lat: 40.3, lon: -86.1, usState: 'IN', label: 'Indiana',        region: 'us-state' },
  'Kansas, USA':         { lat: 38.5, lon: -98.8, usState: 'KS', label: 'Kansas',         region: 'us-state' },
  'Hawaii, USA':         { lat: 20.8, lon: -156.3, usState: 'HI', label: 'Hawaii',        region: 'us-state' },
  'Iowa, USA':           { lat: 42.0, lon: -93.5, usState: 'IA', label: 'Iowa',           region: 'us-state' },
  'Ohio, USA':           { lat: 40.4, lon: -82.7, usState: 'OH', label: 'Ohio',           region: 'us-state' },
  'Pennsylvania, USA':   { lat: 41.2, lon: -77.2, usState: 'PA', label: 'Pennsylvania',   region: 'us-state' },
  'Alabama, USA':        { lat: 32.8, lon: -86.8, usState: 'AL', label: 'Alabama',        region: 'us-state' },
  'Arkansas, USA':       { lat: 34.9, lon: -92.4, usState: 'AR', label: 'Arkansas',       region: 'us-state' },
  'Louisiana, USA':      { lat: 31.0, lon: -91.9, usState: 'LA', label: 'Louisiana',      region: 'us-state' },
  'Massachusetts, USA':  { lat: 42.3, lon: -71.8, usState: 'MA', label: 'Massachusetts',  region: 'us-state' },
  'Missouri, USA':       { lat: 38.5, lon: -92.5, usState: 'MO', label: 'Missouri',       region: 'us-state' },
  'New Hampshire, USA':  { lat: 43.7, lon: -71.6, usState: 'NH', label: 'New Hampshire',  region: 'us-state' },
  'New Jersey, USA':     { lat: 40.1, lon: -74.5, usState: 'NJ', label: 'New Jersey',     region: 'us-state' },
  'North Carolina, USA': { lat: 35.5, lon: -79.0, usState: 'NC', label: 'North Carolina', region: 'us-state' },
  'North Dakota, USA':   { lat: 47.5, lon: -100.5, usState: 'ND', label: 'North Dakota',  region: 'us-state' },
  'Vermont, USA':        { lat: 44.0, lon: -72.7, usState: 'VT', label: 'Vermont',        region: 'us-state' },
  'Wisconsin, USA':      { lat: 44.5, lon: -89.5, usState: 'WI', label: 'Wisconsin',      region: 'us-state' },
  'Wyoming, USA':        { lat: 43.1, lon: -107.3, usState: 'WY', label: 'Wyoming',       region: 'us-state' },
  'District Of Columbia, USA': { lat: 38.9, lon: -77.0, usState: 'DC', label: 'Washington, DC', region: 'us-state' },

  // ── US Cities/Counties ────────────────────────────────────────────
  'Santa Cruz, Ca':       { lat: 36.97, lon: -122.03, usState: 'CA', label: 'Santa Cruz',       region: 'us-city' },
  'San Francisco':        { lat: 37.77, lon: -122.42, usState: 'CA', label: 'San Francisco',    region: 'us-city' },
  'San Jose, Ca':         { lat: 37.34, lon: -121.89, usState: 'CA', label: 'San Jose',         region: 'us-city' },
  'Mountain View,Ca':     { lat: 37.39, lon: -122.08, usState: 'CA', label: 'Mountain View',    region: 'us-city' },
  'Mountain View, Ca':    { lat: 37.39, lon: -122.08, usState: 'CA', label: 'Mountain View',    region: 'us-city' },
  'Prosser, Wa':          { lat: 46.21, lon: -119.77, usState: 'WA', label: 'Prosser',          region: 'us-city' },
  'Norfolk, Va':          { lat: 36.85, lon: -76.29, usState: 'VA', label: 'Norfolk',           region: 'us-city' },
  'Weston, Mo':           { lat: 39.41, lon: -94.90, usState: 'MO', label: 'Weston',            region: 'us-city' },
  'New Orleans, La':      { lat: 29.95, lon: -90.07, usState: 'LA', label: 'New Orleans',       region: 'us-city' },
  'Lynnwood, Wa':         { lat: 47.82, lon: -122.32, usState: 'WA', label: 'Lynnwood',         region: 'us-city' },
  'Onondaga County':      { lat: 43.0, lon: -76.2, usState: 'NY', label: 'Onondaga Co.',        region: 'us-city' },
  'Monroe County, Ny':    { lat: 43.15, lon: -77.6, usState: 'NY', label: 'Monroe Co.',         region: 'us-city' },
  'Cheyenne, Wy':         { lat: 41.14, lon: -104.82, usState: 'WY', label: 'Cheyenne',        region: 'us-city' },
  'Unknown (City Level)': { lat: 39.0, lon: -98.5, label: 'Unknown City', region: 'us-city' },

  // ── Europe ────────────────────────────────────────────────────────
  'European Union': { lat: 50.85, lon: 4.35, label: 'EU', region: 'europe' },
  'United Kingdom': { lat: 51.5, lon: -0.13, label: 'UK', region: 'europe' },
  'Ireland':        { lat: 53.35, lon: -6.26, label: 'Ireland', region: 'europe' },
  'Spain':          { lat: 40.42, lon: -3.70, label: 'Spain', region: 'europe' },
  'Germany':        { lat: 52.52, lon: 13.41, label: 'Germany', region: 'europe' },
  'Italy':          { lat: 41.90, lon: 12.50, label: 'Italy', region: 'europe' },
  'Scotland':       { lat: 56.49, lon: -4.20, label: 'Scotland', region: 'europe' },
  'Turkey':         { lat: 39.93, lon: 32.86, label: 'Turkey', region: 'europe' },
  'Portugal':       { lat: 38.72, lon: -9.14, label: 'Portugal', region: 'europe' },

  // ── Asia-Pacific ──────────────────────────────────────────────────
  'South Korea':  { lat: 37.57, lon: 126.98, label: 'South Korea', region: 'asia' },
  'China':        { lat: 39.90, lon: 116.40, label: 'China', region: 'asia' },
  'Hong Kong':    { lat: 22.32, lon: 114.17, label: 'Hong Kong', region: 'asia' },
  'India':        { lat: 28.61, lon: 77.21, label: 'India', region: 'asia' },
  'Japan':        { lat: 35.68, lon: 139.69, label: 'Japan', region: 'asia' },
  'Taiwan':       { lat: 25.03, lon: 121.56, label: 'Taiwan', region: 'asia' },
  'Thailand':     { lat: 13.76, lon: 100.50, label: 'Thailand', region: 'asia' },
  'Singapore':    { lat: 1.35, lon: 103.82, label: 'Singapore', region: 'asia' },
  'Bangladesh':   { lat: 23.81, lon: 90.41, label: 'Bangladesh', region: 'asia' },
  'Philippines':  { lat: 14.60, lon: 120.98, label: 'Philippines', region: 'asia' },
  'Vietnam':      { lat: 21.03, lon: 105.85, label: 'Vietnam', region: 'asia' },
  'Pakistan':     { lat: 33.69, lon: 73.06, label: 'Pakistan', region: 'asia' },

  // ── Americas (non-US) ────────────────────────────────────────────
  'Ontario':         { lat: 51.25, lon: -85.32, label: 'Ontario', region: 'americas' },
  'Ontario, Canada':  { lat: 51.25, lon: -85.32, label: 'Ontario', region: 'americas' },
  'Canada':           { lat: 45.42, lon: -75.69, label: 'Canada', region: 'americas' },
  'Brazil':           { lat: -15.79, lon: -47.88, label: 'Brazil', region: 'americas' },
  'Ecuador':          { lat: -0.18, lon: -78.47, label: 'Ecuador', region: 'americas' },
  'Australia':        { lat: -35.28, lon: 149.13, label: 'Australia', region: 'asia' },
  'New Zealand':      { lat: -41.29, lon: 174.78, label: 'New Zealand', region: 'asia' },
  'Nigeria':          { lat: 9.08, lon: 7.40, label: 'Nigeria', region: 'global' },
  'South Africa':     { lat: -25.75, lon: 28.19, label: 'South Africa', region: 'global' },
  'Algeria':          { lat: 36.75, lon: 3.06, label: 'Algeria', region: 'global' },
  'Montenegro':       { lat: 42.43, lon: 19.26, label: 'Montenegro', region: 'europe' },

  // ── Global ────────────────────────────────────────────────────────
  'Global': { lat: 20.0, lon: 0.0, label: 'Global', region: 'global' },
};

/** Convert latitude/longitude to a 3D position on a sphere of radius R. */
export function latLonToVec3(lat: number, lon: number, R: number): [number, number, number] {
  const phi   = (90 - lat)  * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return [
    -R * Math.sin(phi) * Math.cos(theta),
     R * Math.cos(phi),
     R * Math.sin(phi) * Math.sin(theta),
  ];
}

/** RAG colour constants (hex for Three.js, CSS for labels). */
export const RAG_HEX: Record<string, number> = {
  Red: 0xea1100, Amber: 0xf97316, Yellow: 0xffc220, Green: 0x22c55e,
};
export const RAG_CSS: Record<string, string> = {
  Red: '#ff6b6b', Amber: '#fb923c', Yellow: '#FFC220', Green: '#4ade80',
};
