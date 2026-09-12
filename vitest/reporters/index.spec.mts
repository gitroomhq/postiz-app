import {
  buildReporters,
  disableClientAnalytics,
  reportPortalEnabled,
  resolveReporterClass,
} from './index.mts';

describe('resolveReporterClass', () => {
  it('resolves the class from the installed agent', async () => {
    // The agent ships as CommonJS, so this is the shape that regressed: reading
    // `default` first yields the module namespace and `new` on it throws.
    const agent = await import('@reportportal/agent-js-vitest');

    expect(resolveReporterClass(agent)).toBeTypeOf('function');
  });

  it('prefers the named export over a CommonJS interop namespace', () => {
    const RPReporter = class {};
    const namespace = { RPReporter, ReportingApi: {} };

    expect(resolveReporterClass({ ...namespace, default: namespace })).toBe(RPReporter);
  });

  it('falls back to a plain default export', () => {
    const RPReporter = class {};

    expect(resolveReporterClass({ default: RPReporter })).toBe(RPReporter);
  });

  it('returns undefined when nothing callable is exported', () => {
    expect(resolveReporterClass({ default: {} })).toBeUndefined();
    expect(resolveReporterClass(undefined)).toBeUndefined();
  });
});

describe('buildReporters', () => {
  it('reports to default and junit only when ReportPortal is not configured', async () => {
    vi.stubEnv('RP_ENABLE', '');

    expect(reportPortalEnabled()).toBe(false);
    expect(await buildReporters('unit')).toEqual(['default', 'junit']);
  });

  it('adds the agent when ReportPortal is configured', async () => {
    vi.stubEnv('RP_ENABLE', 'true');
    vi.stubEnv('RP_ENDPOINT', 'http://127.0.0.1:1/api/v1');
    vi.stubEnv('RP_PROJECT', 'postiz');
    vi.stubEnv('RP_API_KEY', 'not-a-real-key');

    const reporters = await buildReporters('unit');

    expect(reporters).toHaveLength(3);
    expect(reporters[2]).toBeTypeOf('object');
  });
});

describe('disableClientAnalytics', () => {
  it('opts the ReportPortal client out of its google-analytics call', () => {
    vi.stubEnv('REPORTPORTAL_CLIENT_JS_NO_ANALYTICS', '');
    disableClientAnalytics();

    expect(process.env.REPORTPORTAL_CLIENT_JS_NO_ANALYTICS).toBe('1');
  });
});
