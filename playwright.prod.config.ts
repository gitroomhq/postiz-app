import { defineConfig } from '@playwright/test';

/**
 * The deploy gate, run against a REAL deployment.
 *
 * Deliberately not a project inside playwright.config.ts: that config starts
 * Postgres-backed local servers and a fake Mastodon, and its global setup
 * asserts NOT_SECURED=true and DISABLE_SSRF_PROTECTION=true - every one of
 * which would be wrong, or dangerous, pointed at production. Nothing here
 * boots anything; the target already exists.
 *
 * Gated entirely by environment, so an invocation with none of it set is a
 * fast, green, entirely skipped run:
 *
 *   POSTIZ_SMOKE_URL              tier 1  reachability and auth rejection
 *   + POSTIZ_SMOKE_API_KEY        tier 2  read-only checks and a draft round-trip
 *   + POSTIZ_SMOKE_PUBLISH_CHANNELS  tier 3  REAL posts to real accounts
 */
const CI = !!process.env.CI;

const reportPortal =
  process.env.RP_ENABLE === 'true' &&
  process.env.RP_ENDPOINT &&
  process.env.RP_PROJECT &&
  process.env.RP_API_KEY;

if (reportPortal) {
  process.env.REPORTPORTAL_CLIENT_JS_NO_ANALYTICS = '1';
}

export default defineConfig({
  testDir: './e2e/prod',
  outputDir: './test-results-prod',

  // One post at a time against one real org: parallelism here would mean
  // racing on the same channels and the same rate limits.
  fullyParallel: false,
  workers: 1,

  forbidOnly: CI,
  // A retry would publish a second real post, so tier 3 must never be retried.
  retries: 0,

  // Tier 3 waits on a real provider round trip through Temporal.
  timeout: 15 * 60_000,
  expect: { timeout: 30_000 },

  use: {
    trace: 'retain-on-failure',
    actionTimeout: 60_000,
    ignoreHTTPSErrors: false,
  },

  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report-prod' }],
    ['junit', { outputFile: 'reports/junit-e2e-prod.xml' }],
    ...(reportPortal
      ? [
          [
            '@reportportal/agent-js-playwright',
            {
              apiKey: process.env.RP_API_KEY,
              endpoint: process.env.RP_ENDPOINT,
              project: process.env.RP_PROJECT,
              launch: process.env.RP_LAUNCH ?? 'postiz-app',
              launchId: process.env.RP_LAUNCH_ID || undefined,
              attributes: [{ key: 'tier', value: 'e2e-prod' }],
              includeTestSteps: true,
              restClientConfig: { timeout: 30_000 },
            },
          ] as never,
        ]
      : []),
  ],
});
