/**
 * Backward-compatible API barrel.
 *
 * Split from monolithic services/api.ts into domain modules to keep files
 * cohesive and maintainable without changing import surfaces.
 */

export * from './api/core';
export * from './api/vendors';
export * from './api/chat_auth_forms';
export * from './api/intel_dashboard';
export * from './api/incidents_regulatory';
export * from './api/admin';
export * from './api/cso_briefs';
export * from './api/competitors';
