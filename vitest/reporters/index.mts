import { failSoft } from './fail-soft.mts';

/**
 * ReportPortal reporting is opt-in and fails soft.
 *
 * RP_ENDPOINT / RP_PROJECT / RP_LAUNCH / RP_ENABLE are repo *variables* and
 * RP_API_KEY is a repo *secret*. Fork pull requests never receive the secret,
 * so this returns false there and the agent is simply never constructed.
 */
export function reportPortalEnabled(): boolean {
  return (
    process.env.RP_ENABLE === 'true' &&
    Boolean(process.env.RP_ENDPOINT) &&
    Boolean(process.env.RP_PROJECT) &&
    Boolean(process.env.RP_API_KEY)
  );
}

export function reportPortalConfig(tier: string) {
  const attr = (key: string, value?: string) => (value ? [{ key, value }] : []);

  return {
    apiKey: process.env.RP_API_KEY,
    endpoint: process.env.RP_ENDPOINT,
    project: process.env.RP_PROJECT,
    launch: process.env.RP_LAUNCH ?? 'postiz-app',

    // Set by the `rp-start` CI job. When present the agent joins that existing
    // launch and does NOT finish it, which is how all four tiers land in one
    // merged launch; the `rp-finish` job closes it. Locally it is unset, so a
    // developer running with RP credentials gets their own launch per run.
    launchId: process.env.RP_LAUNCH_ID || undefined,

    description: process.env.RP_DESCRIPTION || undefined,
    attributes: [
      { key: 'tier', value: tier },
      ...attr('ci', process.env.GITHUB_ACTIONS ? 'github' : 'local'),
      ...attr('branch', process.env.GITHUB_REF_NAME),
      ...attr('sha', process.env.GITHUB_SHA?.slice(0, 8)),
      ...attr('run', process.env.GITHUB_RUN_ID),
    ],
    mode: process.env.RP_MODE === 'DEBUG' ? 'DEBUG' : 'DEFAULT',
    debug: process.env.RP_DEBUG === 'true',
    skippedIssue: false,
    restClientConfig: { timeout: 15_000 },
  };
}

/**
 * `default` + `junit` always run. The JUnit file is uploaded as a GitHub
 * artifact regardless of whether ReportPortal is reachable, so results survive
 * even when RP does not.
 */
export async function buildReporters(tier: string): Promise<unknown[]> {
  const reporters: unknown[] = ['default', 'junit'];

  if (!reportPortalEnabled()) {
    return reporters;
  }

  try {
    const mod = await import('@reportportal/agent-js-vitest');
    const RPReporter = (mod as any).default ?? (mod as any).RPReporter;
    reporters.push(failSoft(new RPReporter(reportPortalConfig(tier))));
  } catch (error) {
    console.warn('[reportportal] agent could not be loaded, skipping:', error);
  }

  return reporters;
}
