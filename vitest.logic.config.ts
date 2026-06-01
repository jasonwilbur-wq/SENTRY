import { defineConfig } from 'vitest/config';

// Focused config for pure-logic unit tests (no DOM, no React setup).
// Keeps the executiveIntel logic suites fast and dependency-light.
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['components/executiveIntel/**/*.test.ts', 'components/securityLeadership/**/*.test.ts'],
  },
});
