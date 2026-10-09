import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  runWorkflow,
  startTestEnvironment,
  stopTestEnvironment,
  testEnvironmentNow,
  workflowPath,
  type ActivityStubs,
} from '@gitroom/testing/temporal/workflow.env';

/**
 * refreshTokenWorkflow sleeps until a channel's token is about to expire and
 * only then refreshes it, re-reading the integration on the far side of the
 * sleep. That second read is the whole point: a channel deleted or disconnected
 * during a sleep that can be weeks long must not be refreshed afterwards.
 *
 * The time-skipping server collapses those weeks to milliseconds, which is the
 * only reason this is testable at all.
 */
const PATH = workflowPath('refresh.token.workflow.ts');

const HOUR = 60 * 60 * 1000;

/**
 * Built lazily, at the moment the activity answers, and against the server's
 * clock rather than the host's - see testEnvironmentNow.
 */
const integration =
  (over: Record<string, unknown> = {}, expiresInMs = 24 * HOUR) =>
  async () => ({
    id: 'integration-1',
    organizationId: 'org-1',
    providerIdentifier: 'mastodon',
    token: 'current-token',
    tokenExpiration: new Date((await testEnvironmentNow()) + expiresInMs).toISOString(),
    deletedAt: null,
    inBetweenSteps: false,
    refreshNeeded: false,
    ...over,
  });

/**
 * getIntegrationsById answers from a script, one entry per call, so a spec can
 * say "healthy now, deleted after the sleep". The last entry repeats, which
 * keeps the workflow's loop terminating instead of running out of answers.
 */
type Answer = (() => Promise<Record<string, unknown>>) | null;

const run = (script: Answer[], over: ActivityStubs = {}) => {
  let call = 0;
  const getIntegrationsById = vi.fn(async () => {
    const answer = script[Math.min(call++, script.length - 1)];
    return answer ? await answer() : null;
  });
  const refreshToken = vi.fn(async (_integration: Record<string, unknown>) => ({
    accessToken: 'new-token',
  }));
  const activities = { getIntegrationsById, refreshToken, ...over };

  return {
    getIntegrationsById,
    refreshToken,
    result: runWorkflow<boolean>({
      path: PATH,
      type: 'refreshTokenWorkflow',
      activities,
      args: [{ organizationId: 'org-1', integrationId: 'integration-1' }],
    }),
  };
};

describe('refreshTokenWorkflow', () => {
  beforeAll(async () => {
    await startTestEnvironment(PATH);
  }, 180_000);

  afterAll(async () => {
    await stopTestEnvironment();
  });

  it('refreshes once the token is due, then stops when the channel goes away', async () => {
    const { result, refreshToken, getIntegrationsById } = run([
      integration(),
      integration(),
      null,
    ]);

    await expect(result).resolves.toBe(false);
    expect(refreshToken).toHaveBeenCalledTimes(1);
    expect(refreshToken.mock.calls[0][0]).toMatchObject({ id: 'integration-1' });
    // read, re-read after the sleep, then the read that ends the loop
    expect(getIntegrationsById).toHaveBeenCalledTimes(3);
  });

  it('asks for the integration by id and organization', async () => {
    const { result, getIntegrationsById } = run([null]);

    await result;

    expect(getIntegrationsById).toHaveBeenCalledWith('integration-1', 'org-1');
  });

  it.each([
    ['the integration no longer exists', null],
    ['it was deleted', { deletedAt: new Date().toISOString() }],
    ['it is mid-connection', { inBetweenSteps: true }],
    ['it already needs a manual refresh', { refreshNeeded: true }],
  ])('does not refresh when %s', async (_label, over) => {
    const { result, refreshToken } = run([
      over === null ? null : integration(over),
    ]);

    await expect(result).resolves.toBe(false);
    expect(refreshToken).not.toHaveBeenCalled();
  });

  it('does not refresh a token that has already expired', async () => {
    // max(0, past) is 0, and the workflow treats a zero wait as "give up"
    // rather than "refresh now" - so an expired channel is left for the
    // reconnect flow instead of being refreshed on a dead token.
    const { result, refreshToken } = run([
      integration({}, -HOUR),
    ]);

    await expect(result).resolves.toBe(false);
    expect(refreshToken).not.toHaveBeenCalled();
  });

  it.each([
    ['deleted', { deletedAt: new Date().toISOString() }],
    ['disconnected', { refreshNeeded: true }],
    ['mid-reconnection', { inBetweenSteps: true }],
  ])('does not refresh a channel %s while it was sleeping', async (_label, over) => {
    // The guard that matters: the first read is healthy, so the workflow
    // commits to sleeping; by the time it wakes the channel is not refreshable.
    const { result, refreshToken, getIntegrationsById } = run([
      integration(),
      integration(over),
    ]);

    await expect(result).resolves.toBe(false);
    expect(refreshToken).not.toHaveBeenCalled();
    expect(getIntegrationsById).toHaveBeenCalledTimes(2);
  });

  it('vanishing during the sleep is handled, not thrown', async () => {
    const { result, refreshToken } = run([integration(), null]);

    await expect(result).resolves.toBe(false);
    expect(refreshToken).not.toHaveBeenCalled();
  });

  it('keeps refreshing on a schedule for as long as the channel stays healthy', async () => {
    // Two full cycles before the channel disappears, proving the loop re-arms
    // rather than exiting after a single refresh.
    const { result, refreshToken } = run([
      integration(),
      integration(),
      integration({}, 48 * HOUR),
      integration({}, 48 * HOUR),
      null,
    ]);

    await expect(result).resolves.toBe(false);
    expect(refreshToken).toHaveBeenCalledTimes(2);
  });

  it('passes the re-read integration to refreshToken, not the stale first one', async () => {
    // Refreshing with the token read before a multi-week sleep would use a
    // value that another refresh may already have replaced.
    const { result, refreshToken } = run([
      integration({ token: 'stale-token' }),
      integration({ token: 'fresh-token' }),
      null,
    ]);

    await result;

    expect(refreshToken.mock.calls[0][0]).toMatchObject({ token: 'fresh-token' });
  });
});
