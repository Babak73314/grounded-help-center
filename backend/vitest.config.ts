import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // The site's own content modules, so tests run against the real corpus.
    alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) },
  },
  test: {
    include: ['test/**/*.test.ts', 'eval/**/*.test.ts'],
    environment: 'node',
    testTimeout: 30_000,
  },
});
