import { Context } from '@temporalio/activity';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PostActivity } from './post.activity';

describe('PostActivity publication evidence boundary', () => {
  afterEach(() => vi.restoreAllMocks());

  it('does not invoke the provider when pre-provider evidence persistence fails', async () => {
    vi.spyOn(Context, 'current').mockReturnValue({
      info: {
        workflowExecution: { workflowId: 'workflow-1', runId: 'run-1' },
        activityId: 'activity-1',
        activityType: 'postSocialPending',
        attempt: 1,
      },
    } as never);
    const providerPost = vi.fn();
    const postService = {
      updateTags: vi.fn().mockResolvedValue([
        {
          id: 'post-1',
          content: 'approved caption',
          settings: '{}',
          image: '[]',
        },
      ]),
      updateMedia: vi.fn().mockResolvedValue([]),
    };
    const integrationManager = {
      getSocialIntegration: vi.fn().mockReturnValue({
        editor: 'normal',
        mentionFormat: undefined,
        post: providerPost,
      }),
    };
    const publicationAttemptService = {
      beginPublicationAttempt: vi
        .fn()
        .mockRejectedValue(new Error('evidence database unavailable')),
    };
    const activity = new PostActivity(
      postService as never,
      {} as never,
      integrationManager as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      publicationAttemptService as never
    );

    await expect(
      (activity as any).postSocialBody(
        {
          id: 'integration-1',
          internalId: 'account-1',
          organizationId: 'org-1',
          customerId: 'customer-1',
          providerIdentifier: 'example',
          token: 'provider-token',
        },
        [{ id: 'post-1' }],
        false
      )
    ).rejects.toThrow('evidence database unavailable');
    expect(providerPost).not.toHaveBeenCalled();
  });

  it('does not downgrade a committed success after an ambiguous activity timeout', async () => {
    vi.spyOn(Context, 'current').mockReturnValue({
      info: {
        workflowExecution: { workflowId: 'workflow-1', runId: 'run-1' },
        activityId: 'change-state-1',
        activityType: 'changeState',
        attempt: 1,
      },
    } as never);
    const postService = { changeState: vi.fn() };
    const publicationAttemptService = {
      isCorrelatedPost: vi.fn().mockResolvedValue(true),
      markOpenAttemptTerminal: vi.fn().mockResolvedValue(false),
      hasProviderReportedSuccess: vi.fn().mockResolvedValue(true),
    };
    const activity = new PostActivity(
      postService as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      publicationAttemptService as never
    );

    await activity.changeState(
      'post-1',
      'ERROR',
      new Error('activity timed out')
    );

    expect(postService.changeState).not.toHaveBeenCalled();
  });
});
