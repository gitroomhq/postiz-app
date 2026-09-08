import { defineConfig } from 'vitest/config';
import { aliases } from './vitest/aliases.mts';
import { buildReporters } from './vitest/reporters/index.mts';

/**
 * Vite-level options shared by every project.
 *
 * These are spread into each project explicitly in addition to `extends: true`,
 * because a silently-missing `oxc.decorator` block does not fail loudly - it
 * fails as "Nest can't resolve dependencies of X (?, ?, ?)", which reads like a
 * DI bug rather than a config bug. See the decorator-metadata smoke spec.
 */
const shared = {
  resolve: { alias: aliases },

  // Vite 8 transpiles TS/TSX with Oxc (rolldown), not esbuild. Oxc is the only
  // transformer in this pipeline that emits design:paramtypes, which NestJS DI
  // and class-validator both depend on. Vite does NOT read these from
  // tsconfig.base.json: the vite:oxc plugin consumes config.oxc verbatim.
  oxc: {
    decorator: {
      legacy: true, // == tsconfig.base.json experimentalDecorators
      emitDecoratorMetadata: true, // == tsconfig.base.json emitDecoratorMetadata
      // == tsconfig.base.json strictNullChecks:false. Oxc defaults this to
      // true, which emits `Object` for `T | null` params instead of the real
      // constructor, breaking DI for any optional dependency.
      strictNullChecks: false,
    },
    // apps/frontend/tsconfig.json sets jsx:"preserve" for Next's own compiler.
    // Vite's oxc plugin ignores tsconfig, so state the test-time runtime here.
    jsx: { runtime: 'automatic', importSource: 'react' },
  },
};

// Drives the junit filename so parallel CI jobs do not overwrite each other's
// results when the artifacts are collected.
const tier = process.env.TEST_TIER ?? 'all';

export default defineConfig(async () => ({
  ...shared,

  test: {
    globals: true,
    passWithNoTests: true,
    clearMocks: true,
    restoreMocks: true,

    // Reporters and coverage are root-only options; they cannot be set per
    // project, which is why TEST_TIER exists.
    reporters: (await buildReporters(tier)) as never,
    outputFile: { junit: `./reports/junit-${tier}.xml` },

    coverage: {
      provider: 'v8',
      enabled: false, // opt in with --coverage
      reportsDirectory: './coverage',
      reporter: ['text-summary', 'lcov', 'json-summary', 'html'],
      // Deliberately no `thresholds`: coverage is reported, never enforced.
      // Starting from zero, any threshold is either meaningless or blocks
      // everything. Add a ratchet once a real baseline exists.
      all: false,
      include: [
        'apps/backend/src/**/*.{ts,tsx}',
        'apps/orchestrator/src/**/*.{ts,tsx}',
        'apps/frontend/src/**/*.{ts,tsx}',
        'libraries/helpers/src/**/*.{ts,tsx}',
        'libraries/nestjs-libraries/src/**/*.{ts,tsx}',
        'libraries/react-shared-libraries/src/**/*.{ts,tsx}',
      ],
      exclude: [
        '**/*.spec.*',
        '**/*.test.*',
        '**/*.d.ts',
        '**/dist/**',
        '**/node_modules/**',
        '**/.next/**',
        '**/*.dto.ts',
        'apps/frontend/src/**/{layout,loading,error,not-found,page}.tsx',
        'apps/frontend/src/instrumentation.ts',
        'apps/frontend/src/sentry.*.config.ts',
        'apps/backend/src/main.ts',
        'apps/orchestrator/src/main.ts',
        'libraries/react-shared-libraries/src/translation/locales/**',
      ],
    },

    projects: [
      {
        ...shared,
        extends: true,
        test: {
          name: 'unit-node',
          environment: 'node',
          globals: true,
          include: [
            'libraries/helpers/src/**/*.spec.ts',
            'libraries/nestjs-libraries/src/**/*.spec.ts',
            'libraries/testing/src/**/*.spec.ts',
            'apps/backend/src/**/*.spec.ts',
            'apps/orchestrator/src/**/*.spec.ts',
            // The harness itself: a broken reporter fails silently by design,
            // so nothing else would notice it had stopped reporting.
            'vitest/**/*.spec.mts',
          ],
          setupFiles: ['./vitest/setup/node.setup.ts'],
          testTimeout: 10_000,
          hookTimeout: 10_000,
        },
      },

      {
        ...shared,
        extends: true,
        test: {
          name: 'unit-jsdom',
          environment: 'jsdom',
          globals: true,
          include: [
            'apps/frontend/src/**/*.spec.{ts,tsx}',
            'libraries/react-shared-libraries/src/**/*.spec.{ts,tsx}',
          ],
          setupFiles: ['./vitest/setup/jsdom.setup.ts'],
          testTimeout: 10_000,
        },
      },

      {
        ...shared,
        extends: true,
        test: {
          name: 'integration',
          environment: 'node',
          globals: true,
          include: ['tests/integration/**/*.spec.ts'],
          setupFiles: ['./vitest/setup/integration.setup.ts'],
          // Every test shares one Postgres database whose schema is applied
          // with `prisma db push` (the project has no migrations), so running
          // files in parallel means cross-test data races: one file's
          // resetDatabase() truncates mid-way through another file's factory
          // call and fails with a foreign-key violation.
          pool: 'forks',
          isolate: true,
          fileParallelism: false,
          sequence: { concurrent: false, shuffle: false },
          testTimeout: 30_000,
          hookTimeout: 60_000,
        },
      },

      {
        ...shared,
        extends: true,
        test: {
          name: 'workflows',
          environment: 'node',
          globals: true,
          include: ['tests/workflows/**/*.spec.ts'],
          setupFiles: ['./vitest/setup/workflows.setup.ts'],
          // A single shared TestWorkflowEnvironment and one webpack bundle are
          // reused across the file, so files must not run in parallel.
          pool: 'forks',
          fileParallelism: false,
          testTimeout: 120_000,
          hookTimeout: 180_000,
          teardownTimeout: 30_000,
        },
      },
    ],
  },
}));
