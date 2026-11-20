import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { ApplicationFailure } from '@temporalio/common';
import {
  runPostWorkflow,
  startTestEnvironment,
  stopTestEnvironment,
} from '@gitroom/testing/temporal/workflow.env';

/**
 * handleActivityError is a closure inside postWorkflowV112, and CLAUDE.md
 * forbids editing a workflow file already on origin/main - so it cannot be
 * exported and unit-tested. These workflow tests are the only way to reach its
 * classifications at all.
 *
 * The time-skipping server makes this cheap: the scheduling sleep and the 90
 * pending-check waits (~30 minutes of wall clock) collapse to milliseconds.
 */

const integration = {
  id: 'integration-1',
  providerIdentifier: 'mastodon',
  name: 'E2E Mastodon',
  token: 'original-token',
  refreshNeeded: false,
  disabled: false,
};

const post = (over: Record<string, unknown> = {}) => ({
  id: 'post-1',
  state: 'QUEUE',
  publishDate: new Date(Date.now() - 1000).toISOString(),
  organizationId: 'org-1',
  // The workflow does JSON.parse(post.settings) after sendWebhooks. Leaving it
  // undefined throws inside the workflow, which fails the workflow task and
  // retries it forever - a hang rather than a test failure. Always a string.
  settings: '{}',
  intervalInDays: 0,
  integration: { ...integration, organizationId: 'org-1' },
  ...over,
});

/** Stubs for every activity the workflow can reach, overridable per test. */
const activities = (over: Record<string, unknown> = {}) => ({
  getPost: vi.fn(async () => post()),
  getPostsList: vi.fn(async () => [post()]),
  isCommentable: vi.fn(async () => false),
  postSocialPending: vi.fn(async () => [
    { id: 'post-1', postId: 'remote-1', releaseURL: 'https://mastodon.test/1', status: 'success' },
  ]),
  checkPostStatus: vi.fn(async () => ({ status: 'ready', pendingData: {} })),
  finalizePost: vi.fn(async () => ({ status: 'completed', postId: 'remote-1' })),
  postComment: vi.fn(async () => []),
  updatePost: vi.fn(async () => {}),
  changeState: vi.fn(async () => {}),
  inAppNotification: vi.fn(async () => {}),
  sendWebhooks: vi.fn(async () => {}),
  globalPlugs: vi.fn(async () => []),
  internalPlugs: vi.fn(async () => []),
  processPlug: vi.fn(async () => {}),
  processInternalPlug: vi.fn(async () => {}),
  getIntegrationById: vi.fn(async () => integration),
  refreshTokenWithCause: vi.fn(async () => ({ accessToken: 'refreshed-token' })),
  markUnconfirmed: vi.fn(async () => {}),
  ...over,
});

describe('postWorkflowV112', () => {
  beforeAll(async () => {
    await startTestEnvironment();
  }, 180_000);

  afterAll(async () => {
    await stopTestEnvironment();
  });

  it('publishes a simple post and reports success', async () => {
    const acts = activities();

    await runPostWorkflow({ activities: acts });

    expect(acts.postSocialPending).toHaveBeenCalledOnce();
    expect(acts.updatePost).toHaveBeenCalled();
    expect(acts.sendWebhooks).toHaveBeenCalled();
    // A single-item post short-circuits the commentable check entirely.
    expect(acts.isCommentable).not.toHaveBeenCalled();
  });

  it('refuses to publish a post that is no longer queued', async () => {
    // The primary double-publish guard.
    const acts = activities({
      getPost: vi.fn(async () => post({ state: 'PUBLISHED' })),
    });

    await runPostWorkflow({ activities: acts });

    expect(acts.postSocialPending).not.toHaveBeenCalled();
    expect(acts.changeState).toHaveBeenCalledWith(
      'post-1',
      'ERROR',
      'Already posted',
      expect.anything()
    );
  });

  it('stops and notifies when the channel needs reconnecting', async () => {
    const acts = activities({
      getPostsList: vi.fn(async () => [
        post({ integration: { ...integration, refreshNeeded: true } }),
      ]),
    });

    await runPostWorkflow({ activities: acts });

    expect(acts.postSocialPending).not.toHaveBeenCalled();
    expect(acts.inAppNotification).toHaveBeenCalled();
    expect(acts.changeState).toHaveBeenCalledWith(
      'post-1',
      'ERROR',
      'Refresh channel needed',
      expect.anything()
    );
  });

  it('stops and notifies when the channel is disabled', async () => {
    const acts = activities({
      getPostsList: vi.fn(async () => [
        post({ integration: { ...integration, disabled: true } }),
      ]),
    });

    await runPostWorkflow({ activities: acts });

    expect(acts.postSocialPending).not.toHaveBeenCalled();
    expect(acts.changeState).toHaveBeenCalledWith(
      'post-1',
      'ERROR',
      'Channel disabled',
      expect.anything()
    );
  });

  it('refreshes the token and retries once on a refresh_token failure', async () => {
    let attempt = 0;
    const acts = activities({
      postSocialPending: vi.fn(async () => {
        if (attempt++ === 0) {
          throw ApplicationFailure.create({
            type: 'refresh_token',
            message: 'token expired',
            nonRetryable: true,
          });
        }
        return [
          { id: 'post-1', postId: 'remote-1', releaseURL: 'https://mastodon.test/1', status: 'success' },
        ];
      }),
    });

    await runPostWorkflow({ activities: acts });

    expect(acts.refreshTokenWithCause).toHaveBeenCalledOnce();
    expect(acts.postSocialPending).toHaveBeenCalledTimes(2);
    expect(acts.updatePost).toHaveBeenCalled();
  });

  it('gives up when the token refresh itself fails', async () => {
    const acts = activities({
      postSocialPending: vi.fn(async () => {
        throw ApplicationFailure.create({
          type: 'refresh_token',
          message: 'token expired',
          nonRetryable: true,
        });
      }),
      refreshTokenWithCause: vi.fn(async () => false),
    });

    await runPostWorkflow({ activities: acts });

    expect(acts.postSocialPending).toHaveBeenCalledOnce();
    expect(acts.changeState).toHaveBeenCalledWith(
      'post-1',
      'ERROR',
      expect.anything(),
      expect.anything()
    );
  });

  it('treats bad_body as terminal and never retries the publish', async () => {
    // Retrying an irreversible publish is how a user gets posted twice.
    const acts = activities({
      postSocialPending: vi.fn(async () => {
        throw ApplicationFailure.create({
          type: 'bad_body',
          message: 'Too many images',
          nonRetryable: true,
        });
      }),
    });

    await runPostWorkflow({ activities: acts });

    expect(acts.postSocialPending).toHaveBeenCalledOnce();
    expect(acts.refreshTokenWithCause).not.toHaveBeenCalled();
    expect(acts.inAppNotification).toHaveBeenCalled();
  });

  it('carries pending state forward across checks before finalizing', async () => {
    // Each check must receive exactly what the previous one returned: the
    // workflow commits the check's state before finalizePost runs.
    const seen: unknown[] = [];
    let poll = 0;
    const acts = activities({
      postSocialPending: vi.fn(async () => [
        { id: 'post-1', status: 'pending', pendingData: { n: 0 } },
      ]),
      checkPostStatus: vi.fn(async (_i: unknown, pendingData: { n: number }) => {
        seen.push(pendingData);
        poll += 1;
        return poll < 3
          ? { status: 'pending', pendingData: { n: poll } }
          : { status: 'ready', pendingData: { n: poll } };
      }),
    });

    await runPostWorkflow({ activities: acts });

    expect(seen).toEqual([{ n: 0 }, { n: 1 }, { n: 2 }]);
    expect(acts.finalizePost).toHaveBeenCalledOnce();
  });

  it('gives up after the pending-check budget without republishing', async () => {
    const acts = activities({
      postSocialPending: vi.fn(async () => [
        { id: 'post-1', status: 'pending', pendingData: {} },
      ]),
      checkPostStatus: vi.fn(async () => ({ status: 'pending', pendingData: {} })),
    });

    await runPostWorkflow({ activities: acts });

    // maxPendingChecks in the workflow. ~30 minutes of wall clock, skipped.
    expect(acts.checkPostStatus).toHaveBeenCalledTimes(90);
    expect(acts.postSocialPending).toHaveBeenCalledOnce();
    expect(acts.finalizePost).not.toHaveBeenCalled();
    expect(acts.changeState).toHaveBeenCalled();
  });
});
