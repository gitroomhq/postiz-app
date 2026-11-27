import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  runWorkflow,
  startTestEnvironment,
  stopTestEnvironment,
  testEnvironmentNow,
  workflowPath,
} from '@gitroom/testing/temporal/workflow.env';

/**
 * streakWorkflow brackets a 24 hour window: it marks the streak started, waits
 * 22 hours, then waits the last 2 and mails whoever opted in before marking it
 * ended. The time-skipping server turns that whole day into milliseconds.
 *
 * Its activities are proxied onto the hardcoded "main" queue rather than the
 * workflow's own, so the worker has to poll "main" or nothing is ever picked up.
 */
const PATH = workflowPath('streak.workflow.ts');

const user = (over: Record<string, unknown> = {}) => ({
  user: {
    email: 'someone@test',
    sendStreakEmails: true,
    ...over,
  },
});

const run = (users: Array<ReturnType<typeof user>>) => {
  const setStreak = vi.fn(async (_org: string, _phase: string) => {});
  const getUserOrgs = vi.fn(async (_org: string) => ({ users }));
  const sendEmailAsync = vi.fn(
    async (_to: string, _subject: string, _html: string, _addTo: string) => {}
  );

  return {
    setStreak,
    getUserOrgs,
    sendEmailAsync,
    result: runWorkflow({
      path: PATH,
      type: 'streakWorkflow',
      taskQueue: 'main',
      activities: { setStreak, getUserOrgs, sendEmailAsync },
      args: [{ organizationId: 'org-1' }],
    }),
  };
};

describe('streakWorkflow', () => {
  beforeAll(async () => {
    await startTestEnvironment(PATH);
  }, 180_000);

  afterAll(async () => {
    await stopTestEnvironment();
  });

  it('brackets the run with a start and an end marker', async () => {
    const { result, setStreak } = run([user()]);

    await result;

    expect(setStreak).toHaveBeenCalledTimes(2);
    expect(setStreak).toHaveBeenNthCalledWith(1, 'org-1', 'start');
    expect(setStreak).toHaveBeenNthCalledWith(2, 'org-1', 'end');
  });

  it('marks the streak ended even when nobody wanted an email', async () => {
    const { result, setStreak, sendEmailAsync } = run([
      user({ sendStreakEmails: false }),
    ]);

    await result;

    expect(sendEmailAsync).not.toHaveBeenCalled();
    expect(setStreak).toHaveBeenNthCalledWith(2, 'org-1', 'end');
  });

  it('reads the organization members once, after the first wait', async () => {
    const { result, getUserOrgs } = run([user()]);

    await result;

    expect(getUserOrgs).toHaveBeenCalledTimes(1);
    expect(getUserOrgs).toHaveBeenCalledWith('org-1');
  });

  it('sends the "streak ended" mail, not the reminder', async () => {
    // Both branches are guarded by patched('reminder'), and patched() is true
    // for every execution started after the patch - so a new workflow can only
    // ever take the second branch. The "Streak Reminder" copy above it is
    // unreachable for anything started today.
    const { result, sendEmailAsync } = run([user()]);

    await result;

    expect(sendEmailAsync).toHaveBeenCalledTimes(1);
    const [to, subject, html, addTo] = sendEmailAsync.mock.calls[0];
    expect(to).toBe('someone@test');
    expect(subject).toBe('Streak Ended');
    expect(html).toContain('Your streak has ended');
    expect(addTo).toBe('bottom');
  });

  it('mails every member who opted in', async () => {
    const { result, sendEmailAsync } = run([
      user({ email: 'a@test' }),
      user({ email: 'b@test' }),
    ]);

    await result;

    expect(sendEmailAsync.mock.calls.map((c) => c[0])).toEqual([
      'a@test',
      'b@test',
    ]);
  });

  it('skips only the members who opted out', async () => {
    const { result, sendEmailAsync } = run([
      user({ email: 'yes@test' }),
      user({ email: 'no@test', sendStreakEmails: false }),
      user({ email: 'also@test' }),
    ]);

    await result;

    expect(sendEmailAsync.mock.calls.map((c) => c[0])).toEqual([
      'yes@test',
      'also@test',
    ]);
  });

  it('handles an organization with no members at all', async () => {
    const { result, sendEmailAsync, setStreak } = run([]);

    await expect(result).resolves.toBeUndefined();
    expect(sendEmailAsync).not.toHaveBeenCalled();
    expect(setStreak).toHaveBeenCalledTimes(2);
  });

  it('advances the server clock by the full 24 hours it sleeps', async () => {
    // 22 hours then 2. Asserting wall-clock instead would pass whether the
    // sleeps were 24 hours, zero, or deleted outright - it is the SERVER's
    // clock that records them.
    const before = await testEnvironmentNow();
    const { result } = run([user()]);

    await result;

    const elapsed = (await testEnvironmentNow()) - before;
    expect(elapsed).toBeGreaterThanOrEqual(79200000 + 7200000);
  });
});
