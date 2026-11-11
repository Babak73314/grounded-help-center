import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

/** One lint configuration for all three packages: the site, `backend/` and `infra/`. */
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    '.next/**',
    'out/**',
    'next-env.d.ts',
    'playwright-report/**',
    'test-results/**',
    '**/node_modules/**',
    'infra/cdk.out/**',
    'backend/eval/results/**',
  ]),
]);
