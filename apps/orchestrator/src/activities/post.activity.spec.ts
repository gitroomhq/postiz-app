vi.mock('@gitroom/helpers/utils/timer', () => ({ timer: vi.fn(async () => {}) }));
vi.mock('@gitroom/nestjs-libraries/temporal/temporal.heartbeat', () => ({
  setHeartbeatDetails: vi.fn(),
  withHeartbeat: (fn: () => unknown) => fn(),
}));

import { State } from '@prisma/client';

import { PostActivity } from './post.activity';
import { BadBody, Disconnect } from '@gitroom/nestjs-libraries/integrations/social.abstract';

const integration = {
  id: 'i1',
  organizationId: 'org',
  internalId: 'ext-1',
  token: 'token',
  providerIdentifier: 'mastodon',
} as never;

const socialProvider = (over: Record<string, unknown> = {}) => ({
  editor: 'normal',
  post: vi.fn(async () => [{ id: 'post-1', postId: 'p1', releaseURL: 'u', status: 'success' }]),
  ...over,
});

const mocks = () => ({
  postService: {
    searchForMissingThreeHoursPosts: vi.fn(async () => []),
    updatePost: vi.fn(),
    getPostById: vi.fn(),
    getPostsRecursively: vi.fn(async () => []),
    updateTags: vi.fn(async (_org: string, posts: unknown) => posts),
    updateMedia: vi.fn(async () => []),
    checkPlugs: vi.fn(async () => []),
    checkInternalPlug: vi.fn(async () => []),
    changeState: vi.fn(),
    getPostByForWebhookId: vi.fn(async () => ({ id: 'p1' })),
  },
  notificationService: { inAppNotification: vi.fn() },
  integrationManager: { getSocialIntegration: vi.fn(() => socialProvider()) },
  integrationService: {
    getIntegrationById: vi.fn(),
    disconnectChannel: vi.fn(),
    processPlugs: vi.fn(),
    processInternalPlug: vi.fn(),
  },
  refreshIntegrationService: { refresh: vi.fn() },
  webhookService: { getWebhooks: vi.fn(async () => []) },
  temporalService: {
    client: {
      getRawClient: vi.fn(() => ({
        workflow: { start: vi.fn(async () => ({})), signalWithStart: vi.fn(async () => ({})) },
      })),
    },
  },
  subscriptionService: { getSubscription: vi.fn() },
});

const build = () => {
  const m = mocks();
  const activity = new PostActivity(
    m.postService as never,
    m.notificationService as never,
    m.integrationManager as never,
    m.integrationService as never,
    m.refreshIntegrationService as never,
    m.webhookService as never,
    m.temporalService as never,
    m.subscriptionService as never
  );

  return { activity, ...m };
};

describe('PostActivity.getPost', () => {
  it('returns the post when billing is not configured', async () => {
    const { activity, postService, subscriptionService } = build();
    postService.getPostById.mockResolvedValue({ id: 'p1', state: State.QUEUE });

    await expect(activity.getPost('org', 'p1')).resolves.toMatchObject({ id: 'p1' });
    expect(subscriptionService.getSubscription).not.toHaveBeenCalled();
  });

  it('refuses to publish for an organization with no subscription', async () => {
    const { activity, subscriptionService } = build();
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test');
    subscriptionService.getSubscription.mockResolvedValue(null);

    await expect(activity.getPost('org', 'p1')).resolves.toBe(false);
  });

  it('refuses to publish a soft-deleted post', async () => {
    const { activity, postService } = build();
    postService.getPostById.mockResolvedValue({ id: 'p1', deletedAt: new Date() });

    await expect(activity.getPost('org', 'p1')).resolves.toBe(false);
  });
});

describe('PostActivity repeat-post re-anchoring', () => {
  const anchored = (over: Record<string, unknown> = {}) => ({
    id: 'p1',
    state: State.QUEUE,
    intervalInDays: 7,
    publishDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    ...over,
  });

  it('rolls a long-stale anchor forward to the next occurrence', async () => {
    const { activity, postService } = build();
    postService.getPostById.mockResolvedValue(anchored());

    const post = await activity.getPost('org', 'p1');

    // Handing the workflow the raw past anchor makes it sleep 0 and publish
    // immediately, machine-gunning the channel on every restart.
    expect(new Date((post as { publishDate: Date }).publishDate).getTime()).toBeGreaterThan(
      Date.now()
    );
  });

  it('keeps a recently missed occurrence so the sweep can still catch it up', async () => {
    const { activity, postService } = build();
    const publishDate = new Date(Date.now() - 60 * 60 * 1000);
    postService.getPostById.mockResolvedValue(anchored({ publishDate }));

    await expect(activity.getPost('org', 'p1')).resolves.toMatchObject({ publishDate });
  });

  it('leaves a one-off post alone', async () => {
    const { activity, postService } = build();
    const publishDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    postService.getPostById.mockResolvedValue({
      id: 'p1',
      state: State.QUEUE,
      intervalInDays: null,
      publishDate,
    });

    await expect(activity.getPost('org', 'p1')).resolves.toMatchObject({ publishDate });
  });

  it('leaves a repeat-chain child alone so it publishes immediately', async () => {
    const { activity, postService } = build();
    const publishDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    postService.getPostById.mockResolvedValue(
      anchored({ state: State.PUBLISHED, publishDate })
    );

    await expect(activity.getPost('org', 'p1')).resolves.toMatchObject({ publishDate });
  });
});

describe('PostActivity.getPostsList', () => {
  it('returns nothing when the id belongs to a comment', async () => {
    const { activity, postService } = build();
    postService.getPostsRecursively.mockResolvedValue([
      { id: 'c1', parentPostId: 'p1' },
    ] as never);

    await expect(activity.getPostsList('org', 'c1')).resolves.toEqual([]);
  });

  it('returns nothing for an unknown post', async () => {
    const { activity, postService } = build();
    postService.getPostsRecursively.mockResolvedValue([] as never);

    await expect(activity.getPostsList('org', 'p1')).resolves.toEqual([]);
  });

  it('strips the fields the workflow never reads from every row', async () => {
    const { activity, postService } = build();
    postService.getPostsRecursively.mockResolvedValue([
      {
        id: 'p1',
        content: 'hello',
        state: State.QUEUE,
        error: 'x'.repeat(5000),
        childrenPost: [{ id: 'c1' }],
        comments: [],
        tags: [],
      },
    ] as never);

    const [root] = await activity.getPostsList('org', 'p1');

    // These grow per retry and are side-loaded on every recursive row; they
    // are what pushes the workflow history towards the gRPC frame limit.
    expect(root).not.toHaveProperty('error');
    expect(root).not.toHaveProperty('childrenPost');
    expect(root).toMatchObject({ id: 'p1', content: 'hello' });
  });

  it('returns nothing for an organization with no subscription', async () => {
    const { activity, subscriptionService } = build();
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test');
    subscriptionService.getSubscription.mockResolvedValue(null);

    await expect(activity.getPostsList('org', 'p1')).resolves.toEqual([]);
  });
});

describe('PostActivity.postSocial', () => {
  const posts = [{ id: 'p1', content: 'hello', settings: '{}', image: '[]' }] as never;

  it('resolves tags and media before handing the post to the provider', async () => {
    const { activity, integrationManager, postService } = build();
    const provider = socialProvider();
    integrationManager.getSocialIntegration.mockReturnValue(provider);
    postService.updateMedia.mockResolvedValue([{ path: '/a.jpg' }] as never);

    await activity.postSocial(integration, posts);

    expect(postService.updateTags).toHaveBeenCalledWith('org', posts);
    expect(provider.post).toHaveBeenCalledWith(
      'ext-1',
      'token',
      [expect.objectContaining({ id: 'p1', media: [{ path: '/a.jpg' }] })],
      integration
    );
  });

  it('refuses to publish for an organization with no subscription', async () => {
    const { activity, subscriptionService } = build();
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test');
    subscriptionService.getSubscription.mockResolvedValue(null);

    await expect(activity.postSocial(integration, posts)).rejects.toThrow(
      'No active subscription found for this organization.'
    );
  });

  it('still reports success when the streak workflow cannot be started', async () => {
    const { activity, temporalService } = build();
    temporalService.client.getRawClient.mockReturnValue({
      workflow: {
        start: vi.fn(async () => {
          throw new Error('temporal unreachable');
        }),
      },
    } as never);

    // The post is already live at this point; failing here retries it and
    // publishes a second time.
    await expect(activity.postSocial(integration, posts)).resolves.toMatchObject([
      { status: 'success' },
    ]);
  });

  it('uses postPending only when the provider implements it', async () => {
    const { activity, integrationManager } = build();
    const postPending = vi.fn(async () => [{ status: 'pending' }]);
    const provider = socialProvider({ postPending });
    integrationManager.getSocialIntegration.mockReturnValue(provider);

    await activity.postSocialPending(integration, posts);
    expect(postPending).toHaveBeenCalledOnce();
    expect(provider.post).not.toHaveBeenCalled();
  });

  it('falls back to the blocking post for a provider with no pending support', async () => {
    const { activity, integrationManager } = build();
    const provider = socialProvider();
    integrationManager.getSocialIntegration.mockReturnValue(provider);

    await activity.postSocialPending(integration, posts);

    expect(provider.post).toHaveBeenCalledOnce();
  });

  it('never uses postPending for the old blocking activity', async () => {
    const { activity, integrationManager } = build();
    const postPending = vi.fn();
    const provider = socialProvider({ postPending });
    integrationManager.getSocialIntegration.mockReturnValue(provider);

    // postWorkflow versions before v1.0.6 cannot resolve a pending response.
    await activity.postSocial(integration, posts);

    expect(postPending).not.toHaveBeenCalled();
    expect(provider.post).toHaveBeenCalledOnce();
  });
});

describe('PostActivity disconnect handling', () => {
  const posts = [{ id: 'p1', content: 'hello', settings: '{}', image: '[]' }] as never;

  it('disconnects the channel and reports a terminal failure', async () => {
    const { activity, integrationManager, integrationService } = build();
    integrationManager.getSocialIntegration.mockReturnValue(
      socialProvider({
        post: async () => {
          throw new Disconnect('tiktok', '{}', '{}', 'Daily active user cap reached');
        },
      })
    );

    // Retrying a disconnect forever is what leaves a channel silently stuck;
    // BadBody is terminal in every frozen workflow version.
    await expect(activity.postSocial(integration, posts)).rejects.toBeInstanceOf(BadBody);
    expect(integrationService.disconnectChannel).toHaveBeenCalledWith(
      'org',
      integration,
      'Daily active user cap reached'
    );
  });

  it('still reports the terminal failure when the disconnect itself fails', async () => {
    const { activity, integrationManager, integrationService } = build();
    integrationManager.getSocialIntegration.mockReturnValue(
      socialProvider({
        post: async () => {
          throw new Disconnect('tiktok', '{}', '{}', 'capped');
        },
      })
    );
    integrationService.disconnectChannel.mockRejectedValue(new Error('database down'));

    await expect(activity.postSocial(integration, posts)).rejects.toBeInstanceOf(BadBody);
  });

  it('passes any other provider error through untouched', async () => {
    const { activity, integrationManager, integrationService } = build();
    const original = new Error('rate limited');
    integrationManager.getSocialIntegration.mockReturnValue(
      socialProvider({
        post: async () => {
          throw original;
        },
      })
    );

    await expect(activity.postSocial(integration, posts)).rejects.toBe(original);
    expect(integrationService.disconnectChannel).not.toHaveBeenCalled();
  });

  it('applies the same handling to a pending status check', async () => {
    const { activity, integrationManager, integrationService } = build();
    integrationManager.getSocialIntegration.mockReturnValue(
      socialProvider({
        checkPostStatus: async () => {
          throw new Disconnect('tiktok', '{}', '{}', 'capped');
        },
      })
    );

    await expect(activity.checkPostStatus(integration, {})).rejects.toBeInstanceOf(BadBody);
    expect(integrationService.disconnectChannel).toHaveBeenCalledOnce();
  });

  it('applies the same handling to a finalize', async () => {
    const { activity, integrationManager, integrationService } = build();
    integrationManager.getSocialIntegration.mockReturnValue(
      socialProvider({
        finalizePost: async () => {
          throw new Disconnect('tiktok', '{}', '{}', 'capped');
        },
      })
    );

    await expect(activity.finalizePost(integration, {})).rejects.toBeInstanceOf(BadBody);
    expect(integrationService.disconnectChannel).toHaveBeenCalledOnce();
  });
});

describe('PostActivity.isCommentable', () => {
  it('reports true only when the provider implements comment', async () => {
    const { activity, integrationManager } = build();
    integrationManager.getSocialIntegration.mockReturnValue(
      socialProvider({ comment: vi.fn() })
    );

    await expect(activity.isCommentable(integration)).resolves.toBe(true);
  });

  it('reports false for a provider with no comment support', async () => {
    const { activity } = build();

    await expect(activity.isCommentable(integration)).resolves.toBe(false);
  });
});

describe('PostActivity.searchForMissingThreeHoursPosts', () => {
  it('pokes one workflow per missed post on the provider root queue', async () => {
    const { activity, postService, temporalService } = build();
    const signalWithStart = vi.fn(async () => ({}));
    temporalService.client.getRawClient.mockReturnValue({
      workflow: { signalWithStart },
    } as never);
    postService.searchForMissingThreeHoursPosts.mockResolvedValue([
      {
        id: 'p1',
        organizationId: 'org',
        integration: { providerIdentifier: 'instagram-standalone' },
      },
    ] as never);

    await activity.searchForMissingThreeHoursPosts();

    expect(signalWithStart).toHaveBeenCalledWith(
      'postWorkflowV112',
      expect.objectContaining({
        workflowId: 'post_p1',
        signal: 'poke',
        workflowIdConflictPolicy: 'USE_EXISTING',
        args: [expect.objectContaining({ taskQueue: 'instagram', postId: 'p1' })],
      })
    );
  });

  it('does nothing when no post was missed', async () => {
    const { activity, temporalService } = build();

    await activity.searchForMissingThreeHoursPosts();

    expect(temporalService.client.getRawClient).not.toHaveBeenCalled();
  });
});

describe('PostActivity.sendWebhooks', () => {
  it('delivers the post to a webhook with no integration filter', async () => {
    const { activity, webhookService } = build();
    webhookService.getWebhooks.mockResolvedValue([
      { id: 'w1', url: 'https://hook.test/a', integrations: [] },
    ] as never);
    const fetchMock = vi.fn(async (...args: any[]) => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await activity.sendWebhooks('p1', 'org', 'i1');

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0]).toBe('https://hook.test/a');
  });

  it('skips a webhook scoped to other channels', async () => {
    const { activity, webhookService } = build();
    webhookService.getWebhooks.mockResolvedValue([
      { id: 'w1', url: 'https://hook.test/a', integrations: [{ integration: { id: 'other' } }] },
    ] as never);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await activity.sendWebhooks('p1', 'org', 'i1');

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not fail the workflow when a webhook is unreachable', async () => {
    const { activity, webhookService } = build();
    webhookService.getWebhooks.mockResolvedValue([
      { id: 'w1', url: 'https://hook.test/a', integrations: [] },
    ] as never);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('ECONNREFUSED');
      })
    );

    // The post already published; a dead webhook must never retry it.
    await expect(activity.sendWebhooks('p1', 'org', 'i1')).resolves.toBeUndefined();
  });

  it('does not fail the workflow when the webhook list cannot be read', async () => {
    const { activity, webhookService } = build();
    webhookService.getWebhooks.mockRejectedValue(new Error('database down'));

    await expect(activity.sendWebhooks('p1', 'org', 'i1')).resolves.toBeUndefined();
  });

  it('does not load the post when there is nothing to deliver to', async () => {
    const { activity, postService } = build();

    await activity.sendWebhooks('p1', 'org', 'i1');

    expect(postService.getPostByForWebhookId).not.toHaveBeenCalled();
  });
});

describe('PostActivity thin delegates', () => {
  it('asks the post service for the plugs of this channel', async () => {
    const { activity, postService } = build();

    await activity.globalPlugs(integration);

    expect(postService.checkPlugs).toHaveBeenCalledWith('org', 'mastodon', 'i1');
  });

  it('passes the settings through to the internal plug lookup', async () => {
    const { activity, postService } = build();

    await activity.internalPlugs(integration, { 'plug--a--delay': '1' });

    expect(postService.checkInternalPlug).toHaveBeenCalledWith(integration, 'org', 'i1', {
      'plug--a--delay': '1',
    });
  });

  it('records a state change with its error body', async () => {
    const { activity, postService } = build();

    await activity.changeState('p1', State.ERROR, 'failed', '{}');

    expect(postService.changeState).toHaveBeenCalledWith('p1', State.ERROR, 'failed', '{}');
  });
});
