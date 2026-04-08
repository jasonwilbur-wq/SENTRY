/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  /** User identity for header-based auth (Phase 1). */
  readonly VITE_SENTRY_USER?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}