import { defineConfig, devices } from '@playwright/test';

const FRONTEND = process.env.FRONTEND_URL ?? 'http://localhost:4200';
const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3000';
const ORCHESTRATOR = `http://localhost:${process.env.ORCHESTRATOR_PORT ?? 3002}`;
const MOCK = process.env.MOCK_MASTODON_URL ?? 'http://127.0.0.1:4600';

const CI = !!process.env.CI;

// Only construct the ReportPortal reporter when it is both enabled and
// credentialed, so fork pull requests and local runs simply skip it.
const reportPortal =
  process.env.RP_ENABLE === 'true' &&
  process.env.RP_ENDPOINT &&
  process.env.RP_PROJECT &&
  process.env.RP_API_KEY;

// The ReportPortal client otherwise POSTs a telemetry event to
// google-analytics.com when the launch starts. Mirrors the vitest reporters.
if (reportPortal) {
  process.env.REPORTPORTAL_CLIENT_JS_NO_ANALYTICS = '1';
}

export default defineConfig({
  testDir: './e2e/specs',
  outputDir: './test-results',

  // The mock provider's recorded-request list is global state shared by every
  // spec, and there is a single Temporal namespace behind them. Parallelism
  // would mean cross-test interference rather than speed.
  fullyParallel: false,
  workers: 1,

  forbidOnly: CI,
  retries: CI ? 1 : 0,
  // The publish spec schedules a post a few seconds out and then waits for the
  // orchestrator to pick it up and call the provider.
  timeout: 180_000,
  expect: { timeout: 15_000 },

  globalSetup: './e2e/global.setup.ts',
  globalTeardown: './e2e/global.teardown.ts',

  use: {
    baseURL: FRONTEND,
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 20_000,
    navigationTimeout: 45_000,
  },

  projects: [
    { name: 'api', testMatch: /.*\.api\.spec\.ts/ },
    {
      name: 'chromium',
      testMatch: /.*\.ui\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1600, height: 1000 } },
    },
  ],

  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    // Always written, and uploaded as a CI artifact, so results survive even
    // when ReportPortal does not.
    ['junit', { outputFile: 'reports/junit-e2e.xml' }],
    ...(reportPortal
      ? [
          [
            '@reportportal/agent-js-playwright',
            {
              apiKey: process.env.RP_API_KEY,
              endpoint: process.env.RP_ENDPOINT,
              project: process.env.RP_PROJECT,
              launch: process.env.RP_LAUNCH ?? 'postiz-app',
              // Joins the launch opened by the rp-start CI job and leaves it
              // open; rp-finish closes it once every tier has reported.
              launchId: process.env.RP_LAUNCH_ID || undefined,
              attributes: [{ key: 'tier', value: 'e2e' }],
              includeTestSteps: true,
              restClientConfig: { timeout: 30_000 },
            },
          ] as never,
        ]
      : []),
  ],

  // Playwright owns the app processes so `pnpm test:e2e` behaves the same on a
  // laptop as in CI. The built entrypoints are invoked directly rather than
  // through `pnpm start:prod:*`, because those wrap the command in
  // `dotenv -e ../../.env` and there is no .env in CI.
  webServer: [
    {
      command: 'pnpm exec tsx e2e/mocks/mastodon.server.ts',
      url: `${MOCK}/__mock/health`,
      reuseExistingServer: !CI,
      timeout: 30_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command:
        'node --experimental-require-module ./apps/backend/dist/apps/backend/src/main.js',
      url: `${BACKEND}/`,
      reuseExistingServer: !CI,
      timeout: 120_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command:
        'node --experimental-require-module ./apps/orchestrator/dist/apps/orchestrator/src/main.js',
      // Only answers once the Temporal connection is up and the per-provider
      // workers have been created, which is the real readiness signal.
      url: `${ORCHESTRATOR}/health/status`,
      reuseExistingServer: !CI,
      timeout: 180_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    // The browser specs need Next; the api specs do not. Setting
    // E2E_SKIP_FRONTEND=true runs the api project alone, which is handy when
    // port 4200 is busy or when only the publish path is under investigation.
    ...(process.env.E2E_SKIP_FRONTEND === 'true'
      ? []
      : [
          {
            command: 'pnpm --filter ./apps/frontend exec next start -p 4200',
            // /auth is served without a redirect, unlike /, so it is an honest
            // "Next is actually serving" probe.
            url: `${FRONTEND}/auth`,
            reuseExistingServer: !CI,
            timeout: 120_000,
            stdout: 'pipe' as const,
            stderr: 'pipe' as const,
          },
        ]),
  ],
});
