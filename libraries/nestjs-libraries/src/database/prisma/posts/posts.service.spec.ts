import { BadRequestException, NotFoundException } from '@nestjs/common';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

import axios from 'axios';
import sharp from 'sharp';
import isoWeek from 'dayjs/plugin/isoWeek';
import { IsDefined, IsString } from 'class-validator';

import { PostsService } from './posts.service';
import { RefreshToken } from '@gitroom/nestjs-libraries/integrations/social.abstract';

dayjs.extend(utc);
dayjs.extend(isoWeek);

// this.getMissingContent / checkPostAnalytics sleep 10s after a token refresh
// when the provider asks for it; never let real time into a unit test.
vi.mock('@gitroom/helpers/utils/timer', () => ({ timer: vi.fn(async () => {}) }));

const future = () => dayjs.utc().add(2, 'day').format('YYYY-MM-DDTHH:mm:ss');
const past = () => dayjs.utc().subtract(2, 'day').format('YYYY-MM-DDTHH:mm:ss');

const provider = (over: Record<string, unknown> = {}) => ({
  maxLength: () => 280,
  checkValidity: async () => true as const,
  ...over,
});

type Mocks = ReturnType<typeof mocks>;

const mocks = () => ({
  postRepository: {
    getPostById: vi.fn(),
    getPost: vi.fn(),
    getPosts: vi.fn(),
    getPostsList: vi.fn(),
    getPostsByGroup: vi.fn(),
    getErrorsByPostIds: vi.fn(async () => []),
    getPostUrls: vi.fn(async () => []),
    createOrUpdatePost: vi.fn((...args: any[]) => undefined as any),
    changeState: vi.fn(),
    changeDate: vi.fn(),
    updateImages: vi.fn(),
    deletePost: vi.fn(),
    getPostsCountsByDates: vi.fn(async () => []),
  },
  integrationManager: {
    getSocialIntegration: vi.fn(() => provider()),
    getAllPlugs: vi.fn(() => []),
  },
  integrationService: {
    getIntegrationById: vi.fn(),
    disconnectChannel: vi.fn(),
    getPlugs: vi.fn(async () => []),
    getIntegrationsList: vi.fn(async () => []),
    findFreeDateTime: vi.fn(async () => []),
  },
  mediaService: { getMediaById: vi.fn() },
  shortLinkService: {
    convertTextToShortLinks: vi.fn(),
    getStatistics: vi.fn(),
  },
  openaiService: { separatePosts: vi.fn() },
  temporalService: { client: { getRawClient: vi.fn(), getWorkflowHandle: vi.fn() } },
  refreshIntegrationService: { refresh: vi.fn() },
});

const build = (over: Partial<Mocks> = {}) => {
  const m = { ...mocks(), ...over };
  const service = new PostsService(
    m.postRepository as never,
    m.integrationManager as never,
    m.integrationService as never,
    m.mediaService as never,
    m.shortLinkService as never,
    m.openaiService as never,
    m.temporalService as never,
    m.refreshIntegrationService as never
  );

  return { service, ...m };
};

/** A temporal client whose workflow.list() yields the given executions. */
const temporalClient = (executions: { workflowId: string }[] = []) => {
  const start = vi.fn(async (...args: any[]) => ({}));
  const list = vi.fn((...args: any[]) => ({
    async *[Symbol.asyncIterator]() {
      yield* executions;
    },
  }));

  return { start, list, raw: { workflow: { list, start } } };
};

describe('PostsService republish and past-date guards', () => {
  const published = {
    state: 'PUBLISHED',
    publishDate: new Date('2024-01-02T10:00:00.000Z'),
    integration: { providerIdentifier: 'mastodon' },
  };

  it('refuses a schedule save that would republish an already published post', async () => {
    const { service, postRepository } = build();
    postRepository.getPostById.mockResolvedValue(published);

    const body = {
      type: 'schedule',
      date: future(),
      posts: [{ integration: { id: 'i1' }, settings: { __type: 'mastodon' }, value: [{ id: 'p1' }] }],
    };

    // Publishing a second copy of a post the user only meant to edit is not
    // recoverable - the platform has already shown it to their followers.
    await expect(service.createPost('org', body as never, 'public' as never)).rejects.toThrow(
      /would publish it again to mastodon/
    );
    expect(postRepository.createOrUpdatePost).not.toHaveBeenCalled();
  });

  it('names the provider and the original publish time in the refusal', async () => {
    const { service, postRepository } = build();
    postRepository.getPostById.mockResolvedValue(published);

    const body = {
      type: 'now',
      posts: [{ integration: { id: 'i1' }, settings: { __type: 'mastodon' }, value: [{ id: 'p1' }] }],
    };

    await expect(service.createPost('org', body as never, 'public' as never)).rejects.toThrow(
      /already published on 2024-01-02 10:00 UTC/
    );
  });

  it('lets an explicit republish:true through', async () => {
    const { service, postRepository, temporalService } = build();
    postRepository.getPostById.mockResolvedValue(published);
    postRepository.createOrUpdatePost.mockResolvedValue({
      posts: [{ id: 'new-1', state: 'QUEUE' }],
    });
    temporalService.client.getRawClient.mockReturnValue(temporalClient().raw);

    const body = {
      type: 'schedule',
      date: future(),
      republish: true,
      posts: [{ integration: { id: 'i1' }, settings: { __type: 'mastodon' }, value: [{ id: 'p1' }] }],
    };

    await expect(service.createPost('org', body as never, 'public' as never)).resolves.toEqual([
      { postId: 'new-1', integration: 'i1' },
    ]);
  });

  it('refuses a schedule save carrying a past date', async () => {
    const { service } = build();

    const body = {
      type: 'schedule',
      date: past(),
      posts: [{ integration: { id: 'i1' }, settings: { __type: 'mastodon' }, value: [{}] }],
    };

    await expect(service.createPost('org', body as never, 'public' as never)).rejects.toThrow(
      /is in the past - saving would publish immediately/
    );
  });

  it('allows a date inside the one-minute skew grace', async () => {
    const { service, postRepository, temporalService } = build();
    postRepository.createOrUpdatePost.mockResolvedValue({
      posts: [{ id: 'new-1', state: 'QUEUE' }],
    });
    temporalService.client.getRawClient.mockReturnValue(temporalClient().raw);

    const body = {
      type: 'schedule',
      date: dayjs.utc().subtract(30, 'second').format('YYYY-MM-DDTHH:mm:ss'),
      posts: [{ integration: { id: 'i1' }, settings: { __type: 'mastodon' }, value: [{}] }],
    };

    await expect(service.createPost('org', body as never, 'public' as never)).resolves.toHaveLength(1);
  });

  it('does not guard a "now" publish against a past date', async () => {
    const { service, postRepository, temporalService } = build();
    postRepository.createOrUpdatePost.mockResolvedValue({
      posts: [{ id: 'new-1', state: 'QUEUE' }],
    });
    temporalService.client.getRawClient.mockReturnValue(temporalClient().raw);

    const body = {
      type: 'now',
      date: past(),
      posts: [{ integration: { id: 'i1' }, settings: { __type: 'mastodon' }, value: [{}] }],
    };

    await expect(service.createPost('org', body as never, 'public' as never)).resolves.toHaveLength(1);
  });
});

describe('PostsService.createPost', () => {
  it('shortlinks the content when asked', async () => {
    const { service, postRepository, shortLinkService, temporalService } = build();
    postRepository.createOrUpdatePost.mockResolvedValue({ posts: [{ id: 'p', state: 'QUEUE' }] });
    shortLinkService.convertTextToShortLinks.mockResolvedValue(['short a', 'short b']);
    temporalService.client.getRawClient.mockReturnValue(temporalClient().raw);

    const post = {
      integration: { id: 'i1' },
      settings: { __type: 'mastodon' },
      value: [{ content: 'a https://long.test/page' }, { content: 'b' }],
    };

    await service.createPost(
      'org',
      { type: 'schedule', date: future(), shortLink: true, posts: [post] } as never,
      'public' as never
    );

    expect(shortLinkService.convertTextToShortLinks).toHaveBeenCalledWith('org', [
      'a https://long.test/page',
      'b',
    ]);
    expect(post.value.map((v) => v.content)).toEqual(['short a', 'short b']);
  });

  it('skips shortlinking on a provider that strips links anyway', async () => {
    const { service, postRepository, integrationManager, shortLinkService, temporalService } = build();
    postRepository.createOrUpdatePost.mockResolvedValue({ posts: [{ id: 'p', state: 'QUEUE' }] });
    integrationManager.getSocialIntegration.mockReturnValue(
      provider({ stripLinks: () => true }) as never
    );
    temporalService.client.getRawClient.mockReturnValue(temporalClient().raw);

    const post = {
      integration: { id: 'i1' },
      settings: { __type: 'instagram' },
      value: [{ content: 'see https://long.test/page now' }],
    };

    await service.createPost(
      'org',
      { type: 'schedule', date: future(), shortLink: true, posts: [post] } as never,
      'public' as never
    );

    expect(shortLinkService.convertTextToShortLinks).not.toHaveBeenCalled();
    expect(post.value[0].content).toBe('see now');
  });

  it('starts the workflow on the provider root queue, not the full identifier', async () => {
    const { service, postRepository, temporalService } = build();
    postRepository.createOrUpdatePost.mockResolvedValue({ posts: [{ id: 'p1', state: 'QUEUE' }] });
    const client = temporalClient();
    temporalService.client.getRawClient.mockReturnValue(client.raw);

    await service.createPost(
      'org',
      {
        type: 'schedule',
        date: future(),
        posts: [{ integration: { id: 'i1' }, settings: { __type: 'instagram-standalone' }, value: [{}] }],
      } as never,
      'public' as never
    );

    // createPost deliberately does not await startWorkflow, so the call lands
    // a tick later. A wrong task queue here means the post is queued to a
    // worker that does not exist and simply never publishes.
    await vi.waitFor(() =>
      expect(client.raw.workflow.start).toHaveBeenCalledWith(
        'postWorkflowV112',
        expect.objectContaining({ args: [expect.objectContaining({ taskQueue: 'instagram' })] })
      )
    );
  });

  it('does not touch the running workflow for a type "update" save', async () => {
    const { service, postRepository, temporalService } = build();
    postRepository.createOrUpdatePost.mockResolvedValue({ posts: [{ id: 'p1', state: 'QUEUE' }] });
    const client = temporalClient();
    temporalService.client.getRawClient.mockReturnValue(client.raw);

    await service.createPost(
      'org',
      {
        type: 'update',
        date: future(),
        posts: [{ integration: { id: 'i1' }, settings: { __type: 'mastodon' }, value: [{}] }],
      } as never,
      'public' as never
    );

    expect(client.raw.workflow.start).not.toHaveBeenCalled();
    expect(client.raw.workflow.list).not.toHaveBeenCalled();
  });

  it('returns nothing when the repository created no post', async () => {
    const { service, postRepository } = build();
    postRepository.createOrUpdatePost.mockResolvedValue({ posts: [] });

    await expect(
      service.createPost(
        'org',
        {
          type: 'schedule',
          date: future(),
          posts: [{ integration: { id: 'i1' }, settings: { __type: 'mastodon' }, value: [{}] }],
        } as never,
        'public' as never
      )
    ).resolves.toEqual([]);
  });
});

describe('PostsService.startWorkflow', () => {
  it('terminates a running workflow before starting the new one', async () => {
    const { service, temporalService } = build();
    const client = temporalClient([{ workflowId: 'post_p1' }]);
    temporalService.client.getRawClient.mockReturnValue(client.raw);

    const terminate = vi.fn();
    temporalService.client.getWorkflowHandle.mockResolvedValue({
      describe: async () => ({ status: { name: 'RUNNING' } }),
      terminate,
    });

    await service.startWorkflow('mastodon', 'p1', 'org', 'QUEUE' as never);

    expect(terminate).toHaveBeenCalledOnce();
    expect(client.raw.workflow.start).toHaveBeenCalledOnce();
  });

  it('leaves an already terminated workflow alone', async () => {
    const { service, temporalService } = build();
    const client = temporalClient([{ workflowId: 'post_p1' }]);
    temporalService.client.getRawClient.mockReturnValue(client.raw);

    const terminate = vi.fn();
    temporalService.client.getWorkflowHandle.mockResolvedValue({
      describe: async () => ({ status: { name: 'TERMINATED' } }),
      terminate,
    });

    await service.startWorkflow('mastodon', 'p1', 'org', 'QUEUE' as never);

    expect(terminate).not.toHaveBeenCalled();
  });

  it('never starts a workflow for a draft', async () => {
    const { service, temporalService } = build();
    const client = temporalClient();
    temporalService.client.getRawClient.mockReturnValue(client.raw);

    await service.startWorkflow('mastodon', 'p1', 'org', 'DRAFT' as never);

    expect(client.raw.workflow.start).not.toHaveBeenCalled();
  });

  it('passes postId and organizationId as typed search attributes', async () => {
    const { service, temporalService } = build();
    const client = temporalClient();
    temporalService.client.getRawClient.mockReturnValue(client.raw);

    await service.startWorkflow('mastodon', 'p1', 'org-7', 'QUEUE' as never);

    const [, options] = client.raw.workflow.start.mock.calls[0];
    // PostsService swallows a failure here, so an unregistered search attribute
    // leaves the post in QUEUE with no error anywhere.
    expect(options.workflowId).toBe('post_p1');
    expect(options.workflowIdConflictPolicy).toBe('TERMINATE_EXISTING');
    expect(options.typedSearchAttributes).toBeDefined();
  });

  it('still starts the workflow when listing the old ones throws', async () => {
    const { service, temporalService } = build();
    const start = vi.fn(async (...args: any[]) => ({}));
    temporalService.client.getRawClient.mockReturnValue({
      workflow: {
        list: () => {
          throw new Error('temporal unreachable');
        },
        start,
      },
    });

    await expect(
      service.startWorkflow('mastodon', 'p1', 'org', 'QUEUE' as never)
    ).resolves.toBeUndefined();
    expect(start).toHaveBeenCalledOnce();
  });

  it('swallows a failure to start so the caller is never rejected', async () => {
    const { service, temporalService } = build();
    temporalService.client.getRawClient.mockReturnValue({
      workflow: {
        list: () => ({ async *[Symbol.asyncIterator]() {} }),
        start: vi.fn(async () => {
          throw new Error('nope');
        }),
      },
    });

    await expect(
      service.startWorkflow('mastodon', 'p1', 'org', 'QUEUE' as never)
    ).resolves.toBeUndefined();
  });
});

describe('PostsService.arrangePostsByGroup', () => {
  it('orders a thread parent first, then each child in turn', () => {
    const { service } = build();
    const all = [
      { id: 'c2', parentPostId: 'c1', integration: { id: 'i' } },
      { id: 'root', parentPostId: null, integration: { id: 'i' } },
      { id: 'c1', parentPostId: 'root', integration: { id: 'i' } },
    ];

    expect(service.arrangePostsByGroup(all).map((p) => p.id)).toEqual(['root', 'c1', 'c2']);
  });

  it('keeps the integration on the root only', () => {
    const { service } = build();
    const all = [
      { id: 'root', parentPostId: null, integration: { id: 'i' } },
      { id: 'c1', parentPostId: 'root', integration: { id: 'i' } },
    ];

    const [root, child] = service.arrangePostsByGroup(all);
    expect(root.integration).toEqual({ id: 'i' });
    expect(child.integration).toBeUndefined();
  });

  it('returns nothing when no post is a root', () => {
    const { service } = build();
    expect(service.arrangePostsByGroup([{ id: 'c', parentPostId: 'missing' }])).toEqual([]);
  });
});

describe('PostsService.mapTypeToPost', () => {
  it('rejects a body whose posts have no integration id', async () => {
    const { service } = build();

    await expect(
      service.mapTypeToPost({ posts: [{ value: [] }] } as never, 'org')
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects an integration the organization does not own', async () => {
    const { service, integrationService } = build();
    integrationService.getIntegrationById.mockResolvedValue(null);

    await expect(
      service.mapTypeToPost(
        { type: 'schedule', posts: [{ integration: { id: 'nope' }, value: [] }] } as never,
        'org'
      )
    ).rejects.toThrow(/Integration with id nope not found/);
  });

  it('rejects a soft-deleted integration', async () => {
    const { service, integrationService } = build();
    integrationService.getIntegrationById.mockResolvedValue({
      id: 'i1',
      providerIdentifier: 'mastodon',
      deletedAt: new Date(),
    });

    await expect(
      service.mapTypeToPost(
        { type: 'schedule', posts: [{ integration: { id: 'i1' }, value: [] }] } as never,
        'org'
      )
    ).rejects.toThrow(/not found/);
  });

  it('stamps the provider identifier onto the settings as __type', async () => {
    const { service, integrationService } = build();
    integrationService.getIntegrationById.mockResolvedValue({
      id: 'i1',
      providerIdentifier: 'mastodon',
      deletedAt: null,
    });

    const result = await service.mapTypeToPost(
      {
        type: 'schedule',
        date: future(),
        shortLink: false,
        tags: [],
        posts: [
          { integration: { id: 'i1' }, settings: {}, value: [{ content: 'hi', image: [] }] },
        ],
      } as never,
      'org'
    );

    expect((result.posts[0].settings as never as { __type: string }).__type).toBe('mastodon');
  });

  it('rewrites the type to schedule when replacing a draft', async () => {
    const { service, integrationService } = build();
    integrationService.getIntegrationById.mockResolvedValue({
      id: 'i1',
      providerIdentifier: 'mastodon',
      deletedAt: null,
    });

    const result = await service.mapTypeToPost(
      {
        type: 'draft',
        date: future(),
        shortLink: false,
        tags: [],
        posts: [
          { integration: { id: 'i1' }, settings: {}, value: [{ content: 'hi', image: [] }] },
        ],
      } as never,
      'org',
      true
    );

    expect(result.type).toBe('schedule');
    expect(result.posts[0].type).toBe('schedule');
  });
});

describe('PostsService.validatePosts', () => {
  const integration = {
    id: 'i1',
    name: 'My channel',
    providerIdentifier: 'mastodon',
    deletedAt: null,
    additionalSettings: '[]',
  };

  it('accepts a post that is within every limit', async () => {
    const { service, integrationService } = build();
    integrationService.getIntegrationById.mockResolvedValue(integration);

    const [result] = await service.validatePosts('org', [
      { integration: { id: 'i1' }, value: [{ content: 'hello' }] },
    ]);

    expect(result).toMatchObject({
      id: 'i1',
      identifier: 'mastodon',
      name: 'My channel',
      valid: true,
      errors: true,
      emptyContent: false,
      tooLong: false,
      maximumCharacters: 280,
    });
  });

  it('flags a post with neither text nor image as empty', async () => {
    const { service, integrationService } = build();
    integrationService.getIntegrationById.mockResolvedValue(integration);

    const [result] = await service.validatePosts('org', [
      { integration: { id: 'i1' }, value: [{ content: '<p></p>' }] },
    ]);

    expect(result.emptyContent).toBe(true);
  });

  it('does not flag an image-only post as empty', async () => {
    const { service, integrationService } = build();
    integrationService.getIntegrationById.mockResolvedValue(integration);

    const [result] = await service.validatePosts('org', [
      { integration: { id: 'i1' }, value: [{ content: '', image: [{ path: '/a.png' }] }] },
    ]);

    expect(result.emptyContent).toBe(false);
  });

  it('flags content past the provider maximum', async () => {
    const { service, integrationService } = build();
    integrationService.getIntegrationById.mockResolvedValue(integration);

    const [result] = await service.validatePosts('org', [
      { integration: { id: 'i1' }, value: [{ content: 'x'.repeat(281) }] },
    ]);

    expect(result.tooLong).toBe(true);
  });

  it('counts an X post by weighted length, not character count', async () => {
    const { service, integrationService, integrationManager } = build();
    integrationService.getIntegrationById.mockResolvedValue({
      ...integration,
      providerIdentifier: 'x',
    });
    integrationManager.getSocialIntegration.mockReturnValue(
      provider({ maxLength: () => 280 }) as never
    );

    // A CJK character weighs two on X, so 200 of them exceed the 280 limit
    // even though the string is only 200 characters long.
    const [result] = await service.validatePosts('org', [
      { integration: { id: 'i1' }, value: [{ content: '好'.repeat(200) }] },
    ]);

    expect(result.tooLong).toBe(true);
  });

  it('surfaces the provider media rules as errors', async () => {
    const { service, integrationService, integrationManager } = build();
    integrationService.getIntegrationById.mockResolvedValue(integration);
    integrationManager.getSocialIntegration.mockReturnValue(
      provider({ checkValidity: async () => 'You can only upload one video' }) as never
    );

    const [result] = await service.validatePosts('org', [
      { integration: { id: 'i1' }, value: [{ content: 'hi', image: [{ path: '/a.mp4' }] }] },
    ]);

    expect(result.errors).toBe('You can only upload one video');
  });

  it('turns a thrown provider validity check into an error message', async () => {
    const { service, integrationService, integrationManager } = build();
    integrationService.getIntegrationById.mockResolvedValue(integration);
    integrationManager.getSocialIntegration.mockReturnValue(
      provider({
        checkValidity: async () => {
          throw new Error('image too small');
        },
      }) as never
    );

    const [result] = await service.validatePosts('org', [
      { integration: { id: 'i1' }, value: [{ content: 'hi' }] },
    ]);

    expect(result.errors).toBe('image too small');
  });

  it('treats unparseable additionalSettings as empty rather than throwing', async () => {
    const { service, integrationService } = build();
    integrationService.getIntegrationById.mockResolvedValue({
      ...integration,
      additionalSettings: 'not json',
    });

    await expect(
      service.validatePosts('org', [{ integration: { id: 'i1' }, value: [{ content: 'hi' }] }])
    ).resolves.toHaveLength(1);
  });

  it('rejects a post pointing at an integration the organization does not own', async () => {
    const { service, integrationService } = build();
    integrationService.getIntegrationById.mockResolvedValue(null);

    await expect(
      service.validatePosts('org', [{ integration: { id: 'nope' }, value: [] }])
    ).rejects.toThrow(BadRequestException);
  });
});

describe('PostsService.changePostStatus', () => {
  const post = {
    id: 'p1',
    publishDate: new Date(Date.now() + 86_400_000),
    integration: { providerIdentifier: 'instagram-standalone' },
  };

  it('rejects an unknown post', async () => {
    const { service, postRepository } = build();
    postRepository.getPostById.mockResolvedValue(null);

    await expect(service.changePostStatus('org', 'p1', 'draft')).rejects.toThrow('Post not found');
  });

  it('moves a post to DRAFT without starting a workflow', async () => {
    const { service, postRepository, temporalService } = build();
    postRepository.getPostById.mockResolvedValue(post);
    const client = temporalClient();
    temporalService.client.getRawClient.mockReturnValue(client.raw);

    await expect(service.changePostStatus('org', 'p1', 'draft')).resolves.toEqual({
      id: 'p1',
      state: 'DRAFT',
    });
    expect(postRepository.changeState).toHaveBeenCalledWith('p1', 'DRAFT');
    expect(client.raw.workflow.start).not.toHaveBeenCalled();
  });

  it('queues a scheduled post on the provider root task queue', async () => {
    const { service, postRepository, temporalService } = build();
    postRepository.getPostById.mockResolvedValue(post);
    const client = temporalClient();
    temporalService.client.getRawClient.mockReturnValue(client.raw);

    await service.changePostStatus('org', 'p1', 'schedule');

    expect(client.raw.workflow.start).toHaveBeenCalledWith(
      'postWorkflowV112',
      expect.objectContaining({ args: [expect.objectContaining({ taskQueue: 'instagram' })] })
    );
  });

  it('refuses to queue a draft whose date already passed', async () => {
    const { service, postRepository } = build();
    postRepository.getPostById.mockResolvedValue({
      ...post,
      publishDate: new Date(Date.now() - 86_400_000),
    });

    // Queueing it would publish within seconds of the state change.
    await expect(service.changePostStatus('org', 'p1', 'schedule')).rejects.toThrow(
      /is in the past/
    );
  });
});

describe('PostsService.changeDate', () => {
  const queued = {
    id: 'p1',
    state: 'QUEUE',
    publishDate: new Date(),
    integration: { providerIdentifier: 'mastodon' },
  };

  it('refuses to reschedule an already published post', async () => {
    const { service, postRepository } = build();
    postRepository.getPostById.mockResolvedValue({
      ...queued,
      state: 'PUBLISHED',
      publishDate: new Date('2024-01-02T10:00:00.000Z'),
    });

    await expect(service.changeDate('org', 'p1', future())).rejects.toThrow(
      /would publish it again/
    );
  });

  it('lets an update-action date move through on a published post', async () => {
    const { service, postRepository, temporalService } = build();
    postRepository.getPostById.mockResolvedValue({ ...queued, state: 'PUBLISHED' });
    postRepository.changeDate.mockResolvedValue({ id: 'p1' });
    temporalService.client.getRawClient.mockReturnValue(temporalClient().raw);

    await expect(service.changeDate('org', 'p1', future(), 'update')).resolves.toEqual({ id: 'p1' });
  });

  it('does not start a workflow for an update-action move', async () => {
    const { service, postRepository, temporalService } = build();
    postRepository.getPostById.mockResolvedValue(queued);
    postRepository.changeDate.mockResolvedValue({ id: 'p1' });
    const client = temporalClient();
    temporalService.client.getRawClient.mockReturnValue(client.raw);

    await service.changeDate('org', 'p1', future(), 'update');

    expect(client.raw.workflow.start).not.toHaveBeenCalled();
  });

  it('does not apply the past-date guard when the post is a draft', async () => {
    const { service, postRepository, temporalService } = build();
    postRepository.getPostById.mockResolvedValue({ ...queued, state: 'DRAFT' });
    postRepository.changeDate.mockResolvedValue({ id: 'p1' });
    temporalService.client.getRawClient.mockReturnValue(temporalClient().raw);

    await expect(service.changeDate('org', 'p1', past())).resolves.toEqual({ id: 'p1' });
  });

  it('refuses to move a queued post into the past', async () => {
    const { service, postRepository } = build();
    postRepository.getPostById.mockResolvedValue(queued);

    await expect(service.changeDate('org', 'p1', past())).rejects.toThrow(/is in the past/);
  });
});

describe('PostsService.updatePostSettings', () => {
  const root = {
    id: 'p1',
    parentPostId: null,
    state: 'QUEUE',
    publishDate: new Date(Date.now() + 86_400_000),
    settings: '{"existing":"kept","replaced":"old"}',
    content: 'hello',
    image: '[]',
    integration: { id: 'i1', providerIdentifier: 'mastodon' },
    tags: [],
    childrenPost: [],
  };

  const withRoot = (over: Record<string, unknown> = {}) => {
    const built = build();
    built.postRepository.getPost.mockResolvedValue({ ...root, ...over });
    built.integrationService.getIntegrationById.mockResolvedValue({
      id: 'i1',
      name: 'My channel',
      providerIdentifier: 'mastodon',
      deletedAt: null,
      additionalSettings: '[]',
    });
    built.postRepository.createOrUpdatePost.mockResolvedValue({
      posts: [{ id: 'p1', state: 'QUEUE' }],
    });
    return built;
  };

  it('rejects an unknown post', async () => {
    const { service, postRepository } = build();
    postRepository.getPost.mockResolvedValue(null);

    await expect(
      service.updatePostSettings('org', 'p1', {}, 'public' as never)
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects the id of a comment rather than the thread root', async () => {
    const { service } = withRoot({ parentPostId: 'p0' });

    await expect(
      service.updatePostSettings('org', 'c1', {}, 'public' as never)
    ).rejects.toThrow(/pass the id of the main post/);
  });

  it('refuses to touch an already published post', async () => {
    const { service } = withRoot({ state: 'PUBLISHED' });

    await expect(
      service.updatePostSettings('org', 'p1', {}, 'public' as never)
    ).rejects.toThrow(/were not published yet/);
  });

  it('refuses a queued post whose publish time already passed', async () => {
    const { service } = withRoot({ publishDate: new Date(Date.now() - 86_400_000) });

    await expect(
      service.updatePostSettings('org', 'p1', {}, 'public' as never)
    ).rejects.toThrow(/publish time of this post already passed/);
  });

  it('merges the passed keys and leaves the rest of the settings alone', async () => {
    const { service, postRepository } = withRoot();

    await service.updatePostSettings('org', 'p1', { replaced: 'new' }, 'public' as never);

    const [, , , post] = postRepository.createOrUpdatePost.mock.calls[0];
    expect(post.settings).toEqual({ existing: 'kept', replaced: 'new', __type: 'mastodon' });
  });

  it('saves as type "update" so the running workflow is untouched', async () => {
    const { service, postRepository, temporalService } = withRoot();
    const client = temporalClient();
    temporalService.client.getRawClient.mockReturnValue(client.raw);

    await service.updatePostSettings('org', 'p1', { a: 1 }, 'public' as never);

    expect(postRepository.createOrUpdatePost.mock.calls[0][0]).toBe('update');
    expect(client.raw.workflow.start).not.toHaveBeenCalled();
  });

  it('keeps the group stable so an open calendar does not lose the post', async () => {
    const { service, postRepository } = withRoot({ group: 'g-1' });

    await service.updatePostSettings('org', 'p1', { a: 1 }, 'public' as never);

    expect(postRepository.createOrUpdatePost.mock.calls[0][7]).toBe(true);
  });

  it('refuses settings that leave the post empty', async () => {
    const { service } = withRoot({ content: '', image: '[]' });

    await expect(
      service.updatePostSettings('org', 'p1', {}, 'public' as never)
    ).rejects.toThrow(/at least one character or one image/);
  });

  it('skips the settings validation for a draft', async () => {
    const built = withRoot({ state: 'DRAFT' });
    built.integrationManager.getSocialIntegration.mockReturnValue(
      provider({ checkValidity: async () => 'bad media' }) as never
    );

    await expect(
      built.service.updatePostSettings('org', 'p1', {}, 'public' as never)
    ).resolves.toMatchObject({ postId: 'p1' });
  });

  it('rejects a scheduled post whose media rules now fail', async () => {
    const built = withRoot();
    built.integrationManager.getSocialIntegration.mockReturnValue(
      provider({ checkValidity: async () => 'bad media' }) as never
    );

    await expect(
      built.service.updatePostSettings('org', 'p1', {}, 'public' as never)
    ).rejects.toThrow(/My channel: bad media/);
  });
});

describe('PostsService.updateTags', () => {
  it('replaces a (post:id) reference with the released URL', async () => {
    const { service, postRepository } = build();
    postRepository.getPostUrls.mockResolvedValue([
      { id: 'abc', releaseURL: 'https://mastodon.test/@me/1,https://other' },
    ]);

    const [post] = await service.updateTags('org', [
      { content: 'see (post:abc) for more' },
    ] as never);

    // Only the first URL of the comma-separated list belongs in the body.
    expect((post as { content: string }).content).toBe(
      'see https://mastodon.test/@me/1 for more'
    );
  });

  it('leaves a post with no references untouched and hits no database', async () => {
    const { service, postRepository } = build();
    const posts = [{ content: 'nothing to see' }] as never;

    await expect(service.updateTags('org', posts)).resolves.toBe(posts);
    expect(postRepository.getPostUrls).not.toHaveBeenCalled();
  });

  it('drops a reference whose post never released', async () => {
    const { service, postRepository } = build();
    postRepository.getPostUrls.mockResolvedValue([{ id: 'abc', releaseURL: null }]);

    const [post] = await service.updateTags('org', [{ content: 'x (post:abc) y' }] as never);

    expect((post as { content: string }).content).toBe('x  y');
  });
});

describe('PostsService plug discovery', () => {
  it('groups the plug- settings keys into one trigger per name', async () => {
    const { service } = build();

    const result = await service.checkInternalPlug({ id: 'i1' } as never, 'org', 'p1', {
      'plug--repost--integrations': [{ id: 'i2' }, { id: 'i3' }],
      'plug--repost--delay': '60',
      'plug--repost--active': true,
      unrelated: 'ignored',
    });

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      type: 'internal-plug',
      post: 'p1',
      originalIntegration: 'i1',
      integration: 'i2',
      plugName: 'repost',
      orgId: 'org',
      delay: 60,
    });
  });

  it('returns nothing when no plug is configured', async () => {
    const { service } = build();

    await expect(
      service.checkInternalPlug({ id: 'i1' } as never, 'org', 'p1', { shortLink: true })
    ).resolves.toEqual([]);
  });

  it('keeps only the global plugs the provider actually implements', async () => {
    const { service, integrationManager, integrationService } = build();
    integrationManager.getAllPlugs.mockReturnValue([
      {
        identifier: 'mastodon',
        plugs: [{ methodName: 'boost', runEveryMilliseconds: 1000, totalRuns: 3 }],
      },
    ] as never);
    integrationService.getPlugs.mockResolvedValue([
      { id: 'plug-1', plugFunction: 'boost' },
      { id: 'plug-2', plugFunction: 'notImplemented' },
    ] as never);

    await expect(service.checkPlugs('org', 'mastodon', 'i1')).resolves.toEqual([
      { type: 'global', plugId: 'plug-1', delay: 1000, totalRuns: 3 },
    ]);
  });
});

describe('PostsService.checkPostAnalytics', () => {
  const integration = {
    internalId: 'ext-1',
    token: 'token',
    tokenExpiration: new Date(Date.now() + 86_400_000),
    providerIdentifier: 'mastodon',
  };

  it('returns nothing for a post that never released', async () => {
    const { service, postRepository } = build();
    postRepository.getPostById.mockResolvedValue({ id: 'p1', releaseId: null });

    await expect(service.checkPostAnalytics('org', 'p1', 7)).resolves.toEqual([]);
  });

  it('reports a "missing" release rather than pretending there are no analytics', async () => {
    const { service, postRepository } = build();
    postRepository.getPostById.mockResolvedValue({ id: 'p1', releaseId: 'missing' });

    await expect(service.checkPostAnalytics('org', 'p1', 7)).resolves.toEqual({ missing: true });
  });

  it('returns nothing when the provider has no analytics support', async () => {
    const { service, postRepository } = build();
    postRepository.getPostById.mockResolvedValue({ id: 'p1', releaseId: 'r1', integration });

    await expect(service.checkPostAnalytics('org', 'p1', 7)).resolves.toEqual([]);
  });

  it('returns the provider analytics for a live token', async () => {
    const { service, postRepository, integrationManager } = build();
    postRepository.getPostById.mockResolvedValue({ id: 'p1', releaseId: 'r1', integration });
    const analytics = [{ label: 'Likes', percentageChange: 0, data: [] }];
    integrationManager.getSocialIntegration.mockReturnValue(
      provider({ postAnalytics: async () => analytics }) as never
    );

    await expect(service.checkPostAnalytics('org', 'p1', 7)).resolves.toBe(analytics);
  });

  it('refreshes an expired token before asking the provider', async () => {
    const { service, postRepository, integrationManager, refreshIntegrationService } = build();
    const expired = { ...integration, tokenExpiration: new Date(Date.now() - 1000) };
    postRepository.getPostById.mockResolvedValue({ id: 'p1', releaseId: 'r1', integration: expired });
    refreshIntegrationService.refresh.mockResolvedValue({ accessToken: 'fresh' });

    const postAnalytics = vi.fn(async () => []);
    integrationManager.getSocialIntegration.mockReturnValue(provider({ postAnalytics }) as never);

    await service.checkPostAnalytics('org', 'p1', 7);

    expect(refreshIntegrationService.refresh).toHaveBeenCalledOnce();
    expect(postAnalytics).toHaveBeenCalledWith('ext-1', 'fresh', 'r1', 7);
  });

  it('disconnects the channel when the refresh returns no token', async () => {
    const { service, postRepository, integrationManager, integrationService, refreshIntegrationService } =
      build();
    const expired = { ...integration, tokenExpiration: new Date(Date.now() - 1000) };
    postRepository.getPostById.mockResolvedValue({ id: 'p1', releaseId: 'r1', integration: expired });
    refreshIntegrationService.refresh.mockResolvedValue({ accessToken: '' });
    integrationManager.getSocialIntegration.mockReturnValue(
      provider({ postAnalytics: async () => [] }) as never
    );

    await expect(service.checkPostAnalytics('org', 'p1', 7)).resolves.toEqual([]);
    expect(integrationService.disconnectChannel).toHaveBeenCalledOnce();
  });

  it('retries once with a forced refresh when the provider says the token expired', async () => {
    const { service, postRepository, integrationManager, refreshIntegrationService } = build();
    postRepository.getPostById.mockResolvedValue({ id: 'p1', releaseId: 'r1', integration });
    refreshIntegrationService.refresh.mockResolvedValue({ accessToken: 'fresh' });

    const analytics = [{ label: 'Likes', percentageChange: 0, data: [] }];
    const postAnalytics = vi
      .fn()
      .mockRejectedValueOnce(new RefreshToken('mastodon', 'expired', '{}'))
      .mockResolvedValueOnce(analytics);
    integrationManager.getSocialIntegration.mockReturnValue(provider({ postAnalytics }) as never);

    await expect(service.checkPostAnalytics('org', 'p1', 7)).resolves.toBe(analytics);
    expect(postAnalytics).toHaveBeenCalledTimes(2);
  });
});

describe('PostsService.getMissingContent', () => {
  const post = {
    releaseId: 'missing',
    integration: {
      internalId: 'ext-1',
      token: 'token',
      tokenExpiration: new Date(Date.now() + 86_400_000),
      providerIdentifier: 'youtube',
    },
  };

  it('returns nothing unless the release is flagged missing', async () => {
    const { service, postRepository } = build();
    postRepository.getPostById.mockResolvedValue({ ...post, releaseId: 'r1' });

    await expect(service.getMissingContent('org', 'p1')).resolves.toEqual([]);
  });

  it('returns nothing when the provider cannot report missing content', async () => {
    const { service, postRepository } = build();
    postRepository.getPostById.mockResolvedValue(post);

    await expect(service.getMissingContent('org', 'p1')).resolves.toEqual([]);
  });

  it('asks the provider with the integration external id and token', async () => {
    const { service, postRepository, integrationManager } = build();
    postRepository.getPostById.mockResolvedValue(post);
    const missing = vi.fn(async () => [{ id: 'v1', url: 'https://youtu.be/v1' }]);
    integrationManager.getSocialIntegration.mockReturnValue(provider({ missing }) as never);

    await expect(service.getMissingContent('org', 'p1')).resolves.toEqual([
      { id: 'v1', url: 'https://youtu.be/v1' },
    ]);
    expect(missing).toHaveBeenCalledWith('ext-1', 'token');
  });

  it('retries once with a forced refresh on an expired token', async () => {
    const { service, postRepository, integrationManager, refreshIntegrationService } = build();
    postRepository.getPostById.mockResolvedValue(post);
    refreshIntegrationService.refresh.mockResolvedValue({ accessToken: 'fresh' });

    const missing = vi
      .fn()
      .mockRejectedValueOnce(new RefreshToken('youtube', 'expired', '{}'))
      .mockResolvedValueOnce([{ id: 'v1', url: 'https://youtu.be/v1' }]);
    integrationManager.getSocialIntegration.mockReturnValue(provider({ missing }) as never);

    await expect(service.getMissingContent('org', 'p1')).resolves.toHaveLength(1);
    expect(missing).toHaveBeenCalledTimes(2);
  });

  it('gives up when the refresh itself fails', async () => {
    const { service, postRepository, integrationManager, refreshIntegrationService } = build();
    postRepository.getPostById.mockResolvedValue({
      ...post,
      integration: { ...post.integration, tokenExpiration: new Date(Date.now() - 1000) },
    });
    refreshIntegrationService.refresh.mockResolvedValue(null);
    integrationManager.getSocialIntegration.mockReturnValue(
      provider({ missing: vi.fn() }) as never
    );

    await expect(service.getMissingContent('org', 'p1')).resolves.toEqual([]);
  });
});

describe('PostsService.deletePost', () => {
  it('terminates the running publish workflow of the deleted post', async () => {
    const { service, postRepository, temporalService } = build();
    postRepository.deletePost.mockResolvedValue({ id: 'p1' });
    temporalService.client.getRawClient.mockReturnValue(
      temporalClient([{ workflowId: 'post_p1' }]).raw
    );

    const terminate = vi.fn();
    temporalService.client.getWorkflowHandle.mockResolvedValue({
      describe: async () => ({ status: { name: 'RUNNING' } }),
      terminate,
    });

    // A surviving workflow would publish a post the user just deleted.
    await expect(service.deletePost('org', 'g1')).resolves.toEqual({ error: true });
    expect(terminate).toHaveBeenCalledOnce();
  });

  it('does not reach for temporal when nothing was deleted', async () => {
    const { service, postRepository, temporalService } = build();
    postRepository.deletePost.mockResolvedValue(null);

    await expect(service.deletePost('org', 'g1')).resolves.toEqual({ error: true });
    expect(temporalService.client.getRawClient).not.toHaveBeenCalled();
  });
});

describe('PostsService.updateMedia', () => {
  it('resolves an id-only image through the media service and absolutises the path', async () => {
    const { service, mediaService, postRepository } = build();
    vi.stubEnv('FRONTEND_URL', 'https://app.test');
    vi.stubEnv('NEXT_PUBLIC_UPLOAD_STATIC_DIRECTORY', 'uploads');
    vi.stubEnv('UPLOAD_DIRECTORY', '/srv/uploads');
    mediaService.getMediaById.mockResolvedValue({ id: 'm1', path: '/a.png' });

    const [image] = await service.updateMedia('p1', [{ id: 'm1' }]);

    expect(image).toMatchObject({
      url: 'https://app.test/uploads/a.png',
      path: '/srv/uploads/a.png',
      type: 'image',
    });
    expect(postRepository.updateImages).toHaveBeenCalledWith('p1', JSON.stringify([image]));
  });

  it('leaves an already absolute url alone', async () => {
    const { service, postRepository } = build();

    const [image] = await service.updateMedia('p1', [{ path: 'https://cdn.test/a.png' }]);

    expect(image).toMatchObject({
      url: 'https://cdn.test/a.png',
      path: 'https://cdn.test/a.png',
    });
    // Nothing was resolved, so there is nothing to write back.
    expect(postRepository.updateImages).not.toHaveBeenCalled();
  });

  it('returns the original list when anything goes wrong', async () => {
    const { service, mediaService } = build();
    const original = [{ id: 'm1' }];
    mediaService.getMediaById.mockRejectedValue(new Error('gone'));

    await expect(service.updateMedia('p1', original)).resolves.toBe(original);
  });

  it('handles an empty list', async () => {
    const { service } = build();
    await expect(service.updateMedia('p1', [])).resolves.toEqual([]);
  });
});

describe('PostsService thin repository delegates', () => {
  it('minifies the calendar response', async () => {
    const { service, postRepository } = build();
    postRepository.getPosts.mockResolvedValue([
      { id: 'p1', content: 'hi', state: 'QUEUE', integration: { id: 'i1' } },
    ]);

    const result = await service.getPostsMinified('org', {} as never);

    // Minified keys, not the raw ones - the frontend expands them back.
    expect(JSON.stringify(result)).not.toContain('"content"');
    expect(result).toHaveProperty('p');
  });

  it('minifies the list response', async () => {
    const { service, postRepository } = build();
    postRepository.getPostsList.mockResolvedValue({ posts: [], total: 0, page: 1 });

    await expect(service.getPostsList('org', {} as never)).resolves.toHaveProperty('t', 0);
  });

  it('walks a thread through the repository one child at a time', async () => {
    const { service, postRepository } = build();
    postRepository.getPost
      .mockResolvedValueOnce({ id: 'root', childrenPost: [{ id: 'c1' }] })
      .mockResolvedValueOnce({ id: 'c1', childrenPost: [] });

    await expect(service.getPostsRecursively('root', true, 'org', true)).resolves.toHaveLength(2);
  });

  it('returns nothing for a thread root that does not exist', async () => {
    const { service, postRepository } = build();
    postRepository.getPost.mockResolvedValue(null);

    await expect(service.getPostsRecursively('root')).resolves.toEqual([]);
  });
});

describe('PostsService.getPostGroupDebugExport', () => {
  const groupRows = () => [
    {
      id: 'root',
      parentPostId: null,
      group: 'g-1',
      state: 'ERROR',
      error: 'boom',
      content: 'the main post',
      image: '[{"path":"/a.jpg"}]',
      delay: 0,
      settings: '{"spoilerText":"heads up"}',
      publishDate: new Date('2024-05-01T09:00:00.000Z'),
      tags: [{ tag: { id: 't1', name: 'Launch' } }],
      integration: { providerIdentifier: 'mastodon', name: 'My channel' },
    },
    {
      id: 'c1',
      parentPostId: 'root',
      content: 'the comment',
      image: '[]',
      delay: 60,
      integration: { providerIdentifier: 'mastodon' },
    },
  ];

  it('exports the group as a body that can be replayed on another instance', async () => {
    const { service, postRepository } = build();
    postRepository.getPostsByGroup.mockResolvedValue(groupRows() as never);

    const exported = await service.getPostGroupDebugExport('org', 'g-1');

    expect(exported).toMatchObject({
      type: 'draft',
      shortLink: false,
      date: '2024-05-01T09:00:00.000Z',
      tags: [{ value: 't1', label: 'Launch' }],
    });
    // The local integration id is meaningless elsewhere, so it is deliberately
    // a placeholder rather than a real id.
    expect(exported.posts[0].integration).toEqual({
      id: 'REPLACE_WITH_LOCAL_INTEGRATION_ID',
    });
    expect(exported.posts[0].value).toEqual([
      { content: 'the main post', image: [{ path: '/a.jpg' }], delay: 0 },
      { content: 'the comment', image: [], delay: 60 },
    ]);
  });

  it('carries the failure detail that makes the export worth having', async () => {
    const { service, postRepository } = build();
    postRepository.getPostsByGroup.mockResolvedValue(groupRows() as never);
    postRepository.getErrorsByPostIds.mockResolvedValue([
      {
        message: 'rejected',
        platform: 'mastodon',
        body: '{}',
        createdAt: new Date('2024-05-01T09:00:05.000Z'),
      },
    ] as never);

    const exported = await service.getPostGroupDebugExport('org', 'g-1');

    expect(exported._debug).toMatchObject({
      providerIdentifier: 'mastodon',
      state: 'ERROR',
      error: 'boom',
      originalGroup: 'g-1',
      errors: [{ message: 'rejected', platform: 'mastodon' }],
    });
  });

  it('exports an untagged post with an empty tag list', async () => {
    const { service, postRepository } = build();
    const [root, comment] = groupRows();
    postRepository.getPostsByGroup.mockResolvedValue([
      { ...root, tags: undefined },
      comment,
    ] as never);

    await expect(service.getPostGroupDebugExport('org', 'g-1')).resolves.toMatchObject({
      tags: [],
    });
  });
});

describe('PostsService.getPostsByGroup', () => {
  it('returns the whole thread with its settings and channel', async () => {
    const { service, postRepository } = build();
    postRepository.getPostsByGroup.mockResolvedValue([
      {
        id: 'root',
        parentPostId: null,
        group: 'g-1',
        image: '[]',
        settings: '{"spoilerText":"x"}',
        integrationId: 'i1',
        integration: { picture: 'https://pic.test' },
      },
      { id: 'c1', parentPostId: 'root', image: '[]' },
    ] as never);

    await expect(service.getPostsByGroup('org', 'g-1')).resolves.toMatchObject({
      group: 'g-1',
      integration: 'i1',
      integrationPicture: 'https://pic.test',
      settings: { spoilerText: 'x' },
      posts: [{ id: 'root' }, { id: 'c1' }],
    });
  });
});

describe('PostsService.getPost', () => {
  it('walks the thread and resolves each entry’s media', async () => {
    const { service, postRepository } = build();
    postRepository.getPost
      .mockResolvedValueOnce({
        id: 'root',
        image: '[]',
        settings: '{}',
        integrationId: 'i1',
        integration: { picture: 'https://pic.test' },
        group: 'g-1',
        childrenPost: [{ id: 'c1' }],
      } as never)
      .mockResolvedValueOnce({ id: 'c1', image: '[]', childrenPost: [] } as never);

    await expect(service.getPost('org', 'root')).resolves.toMatchObject({
      group: 'g-1',
      integration: 'i1',
      posts: [{ id: 'root' }, { id: 'c1' }],
    });
  });
});

describe('PostsService.getStatistics', () => {
  it('reports the click tracking of every message in the thread', async () => {
    const { service, postRepository, shortLinkService } = build();
    postRepository.getPost
      .mockResolvedValueOnce({ id: 'root', content: 'a', childrenPost: [{ id: 'c1' }] } as never)
      .mockResolvedValueOnce({ id: 'c1', content: 'b', childrenPost: [] } as never);
    shortLinkService.getStatistics.mockResolvedValue([{ short: 'x', clicks: 3 }] as never);

    await expect(service.getStatistics('org', 'root')).resolves.toEqual({
      clicks: [{ short: 'x', clicks: 3 }],
    });
    expect(shortLinkService.getStatistics).toHaveBeenCalledWith(['a', 'b']);
  });
});

describe('PostsService.findFreeDateTime', () => {
  it('returns the earliest free slot of the first day that has one', async () => {
    const { service, integrationService, postRepository } = build();
    integrationService.findFreeDateTime.mockResolvedValue([540, 720] as never);
    postRepository.getPostsCountsByDates.mockResolvedValue([720, 540] as never);

    const slot = await service.findFreeDateTime('org');

    // 540 minutes past midnight is 09:00 - the smallest free slot wins.
    expect(slot).toMatch(/T09:00:00$/);
  });

  it('moves to the next day when the whole day is taken', async () => {
    const { service, integrationService, postRepository } = build();
    integrationService.findFreeDateTime.mockResolvedValue([540] as never);
    const counts = postRepository.getPostsCountsByDates;
    counts.mockResolvedValueOnce([] as never).mockResolvedValueOnce([600] as never);

    await expect(service.findFreeDateTime('org')).resolves.toMatch(/T10:00:00$/);
    expect(counts).toHaveBeenCalledTimes(2);
  });
});

describe('PostsService.generatePostsDraft', () => {
  it('drafts one post per enabled channel, skipping reddit', async () => {
    const { service, integrationService, postRepository, temporalService } = build();
    integrationService.getIntegrationsList.mockResolvedValue([
      { id: 'i1', providerIdentifier: 'mastodon', disabled: false },
      { id: 'i2', providerIdentifier: 'reddit', disabled: false },
      { id: 'i3', providerIdentifier: 'x', disabled: true },
    ] as never);
    postRepository.createOrUpdatePost.mockResolvedValue({ posts: [{ id: 'p', state: 'DRAFT' }] });
    temporalService.client.getRawClient.mockReturnValue(temporalClient().raw);

    await service.generatePostsDraft('org', {
      week: dayjs.utc().isoWeek(),
      year: dayjs.utc().add(1, 'year').year(),
      posts: [{ list: [{ post: 'first' }, { post: 'second' }] }],
      url: 'https://example.test/story',
    } as never);

    // Reddit needs a subreddit chosen by hand, and a disabled channel must not
    // be drafted to at all.
    expect(postRepository.createOrUpdatePost).toHaveBeenCalledOnce();
    const [type, , , post] = postRepository.createOrUpdatePost.mock.calls[0];
    expect(type).toBe('draft');
    expect(post.settings.__type).toBe('mastodon');
    expect(post.value.map((v: { content: string }) => v.content)).toEqual([
      'first',
      'second',
      'Check out the full story here:\nhttps://example.test/story',
    ]);
  });
});

describe('PostsService.updateMedia image conversion', () => {
  it('converts a png to jpeg and writes the new path back', async () => {
    const { service, postRepository } = build();
    vi.stubEnv('FRONTEND_URL', 'https://app.test');
    vi.stubEnv('NEXT_PUBLIC_UPLOAD_STATIC_DIRECTORY', 'uploads');
    vi.stubEnv('UPLOAD_DIRECTORY', '/srv/uploads');

    const png = await sharp({
      create: { width: 2, height: 2, channels: 3, background: '#ff0000' },
    })
      .png()
      .toBuffer();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(png, { status: 200 }))
    );
    vi.spyOn(axios, 'get').mockResolvedValue({ data: png } as never);
    const uploadFile = vi.fn(async () => ({ path: '/converted.jpg', originalname: 'converted.jpg' }));
    (service as never as { storage: unknown }).storage = { uploadFile };

    const [image] = await service.updateMedia('p1', [{ path: '/a.png' }], true);

    // Instagram and a few others reject png outright, so the conversion has to
    // happen before the post is built.
    expect(uploadFile).toHaveBeenCalledOnce();
    expect(image).toMatchObject({
      url: 'https://app.test/uploads/converted.jpg',
      path: '/srv/uploads/converted.jpg',
      name: 'converted.jpg',
    });
    expect(postRepository.updateImages).toHaveBeenCalled();
  });

  it('leaves a jpeg alone even when conversion is requested', async () => {
    const { service, postRepository } = build();
    const get = vi.spyOn(axios, 'get');

    const [image] = await service.updateMedia('p1', [{ path: '/a.jpg' }], true);

    expect(get).not.toHaveBeenCalled();
    expect(image).toMatchObject({ path: expect.stringContaining('/a.jpg') });
    expect(postRepository.updateImages).not.toHaveBeenCalled();
  });
});

describe('PostsService.validatePosts settings validation', () => {
  class RequiredTitleDto {
    @IsDefined({ message: 'Title is required' })
    @IsString()
    title!: string;
  }

  const integration = {
    id: 'i1',
    name: 'My channel',
    providerIdentifier: 'mastodon',
    deletedAt: null,
    additionalSettings: '[]',
  };

  it('reports the first message from the provider settings DTO', async () => {
    const { service, integrationService, integrationManager } = build();
    integrationService.getIntegrationById.mockResolvedValue(integration);
    integrationManager.getSocialIntegration.mockReturnValue(
      provider({ dto: RequiredTitleDto }) as never
    );

    const [result] = await service.validatePosts('org', [
      { integration: { id: 'i1' }, settings: {}, value: [{ content: 'hi' }] },
    ]);

    expect(result.valid).toBe(false);
    expect(result.settingsError).toBe('Title is required');
  });

  it('accepts settings the provider DTO is happy with', async () => {
    const { service, integrationService, integrationManager } = build();
    integrationService.getIntegrationById.mockResolvedValue(integration);
    integrationManager.getSocialIntegration.mockReturnValue(
      provider({ dto: RequiredTitleDto }) as never
    );

    const [result] = await service.validatePosts('org', [
      { integration: { id: 'i1' }, settings: { title: 'A title' }, value: [{ content: 'hi' }] },
    ]);

    expect(result).toMatchObject({ valid: true, settingsError: '' });
  });
});

describe('PostsService thin repository delegates', () => {
  it.each([
    ['searchForMissingThreeHoursPosts', [], 'searchForMissingThreeHoursPosts'],
    ['countPostsFromDay', ['org', new Date()], 'countPostsFromDay'],
    ['getPostByForWebhookId', ['p1'], 'getPostByForWebhookId'],
    ['findAllExistingCategories', [], 'findAllExistingCategories'],
    ['findAllExistingTopicsOfCategory', ['cat'], 'findAllExistingTopicsOfCategory'],
    ['findPopularPosts', ['cat', 'topic'], 'findPopularPosts'],
    ['createPopularPosts', [{ category: 'c' }], 'createPopularPosts'],
    ['getComments', ['p1'], 'getComments'],
    ['getTags', ['org'], 'getTags'],
    ['createTag', ['org', { name: 'x' }], 'createTag'],
    ['editTag', ['t1', 'org', { name: 'x' }], 'editTag'],
    ['deleteTag', ['t1', 'org'], 'deleteTag'],
    ['createComment', ['org', 'u1', 'p1', 'hi'], 'createComment'],
    ['getPostById', ['p1', 'org'], 'getPostById'],
    ['updateReleaseId', ['org', 'p1', 'r1'], 'updateReleaseId'],
    ['updatePost', ['p1', 'ext', 'https://x'], 'updatePost'],
    ['getOldPosts', ['org', '2024-01-01'], 'getOldPosts'],
    ['changeState', ['p1', 'PUBLISHED'], 'changeState'],
    ['getPosts', ['org', {}], 'getPosts'],
  ])('%s reaches the repository', async (method, args, repoMethod) => {
    const { service, postRepository } = build();
    (postRepository as Record<string, unknown>)[repoMethod] = vi.fn(async () => 'ok');

    await expect((service as any)[method](...args)).resolves.toBe('ok');
  });

  it('asks openai to split a long post', async () => {
    const { service, openaiService } = build();
    openaiService.separatePosts.mockResolvedValue(['a', 'b'] as never);

    await expect(service.separatePosts('a long post', 280)).resolves.toEqual(['a', 'b']);
    expect(openaiService.separatePosts).toHaveBeenCalledWith('a long post', 280);
  });
});
