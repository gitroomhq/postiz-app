const redisStore = new Map<string, string>();
let redisMock: any;

jest.mock('@gitroom/nestjs-libraries/redis/redis.service', () => ({
  ioRedis: (redisMock = {
    get: jest.fn(async (key: string) => redisStore.get(key) || null),
    set: jest.fn(async (key: string, value: string) => {
      redisStore.set(key, value);
      return 'OK';
    }),
    del: jest.fn(async (key: string) => {
      redisStore.delete(key);
      return 1;
    }),
    incr: jest.fn(async (key: string) => {
      const current = Number(redisStore.get(key) || 0);
      const next = current + 1;
      redisStore.set(key, String(next));
      return next;
    }),
    expire: jest.fn(async () => 1),
  }),
}));

import { ReviewService } from './review.service';

describe('ReviewService', () => {
  const tokenRows: any[] = [];
  const eventRows: any[] = [];
  const postsService = {
    getPostsRecursively: jest.fn(),
  } as any;
  const prisma = {
    post: {
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
    userOrganization: {
      findFirst: jest.fn(),
    },
    comments: {
      create: jest.fn(),
    },
    reviewToken: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    reviewEvent: {
      create: jest.fn(),
    },
  } as any;
  const notificationService = {
    inAppNotification: jest.fn(),
  } as any;
  const temporalStart = jest.fn(async () => undefined);
  const temporalSignal = jest.fn(async () => undefined);
  const temporalService = {
    client: {
      getRawClient: jest.fn(() => ({
        workflow: {
          start: temporalStart,
        },
      })),
      getWorkflowHandle: jest.fn(async () => ({
        signal: temporalSignal,
      })),
    },
  } as any;

  let service: ReviewService;

  beforeEach(() => {
    redisStore.clear();
    jest.clearAllMocks();
    tokenRows.length = 0;
    eventRows.length = 0;
    temporalStart.mockClear();
    temporalSignal.mockClear();
    service = new ReviewService(
      postsService,
      prisma,
      notificationService,
      temporalService
    );
    process.env.FRONTEND_URL = 'http://localhost:4200';

    postsService.getPostsRecursively.mockResolvedValue([
      { id: 'p1', publishDate: '2026-02-26T10:00:00.000Z' },
    ]);
    prisma.post.findUnique.mockResolvedValue({ id: 'p1', group: 'g1' });
    prisma.post.updateMany.mockResolvedValue({ count: 1 });
    prisma.userOrganization.findFirst.mockResolvedValue({ userId: 'owner-1' });
    prisma.comments.create.mockResolvedValue({ id: 'c1' });
    notificationService.inAppNotification.mockResolvedValue(undefined);

    prisma.reviewToken.findUnique.mockImplementation(
      async ({ where, include }: any) => {
        const row = tokenRows.find((t) => t.tokenHash === where.tokenHash);
        if (!row) return null;
        if (include?.events) {
          return {
            ...row,
            events: eventRows.filter((e) => e.reviewTokenId === row.id),
          };
        }
        return row;
      }
    );
    prisma.reviewToken.findFirst.mockImplementation(async ({ where }: any) => {
      return (
        tokenRows
          .filter(
            (t) =>
              t.organizationId === where.organizationId &&
              t.postId === where.postId &&
              t.status === where.status
          )
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ||
        null
      );
    });
    prisma.reviewToken.create.mockImplementation(async ({ data }: any) => {
      const row = {
        id: `rt_${tokenRows.length + 1}`,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      tokenRows.push(row);
      return row;
    });
    prisma.reviewToken.update.mockImplementation(async ({ where, data }: any) => {
      const idx = tokenRows.findIndex((t) => t.id === where.id);
      if (idx === -1) throw new Error('not found');
      tokenRows[idx] = { ...tokenRows[idx], ...data, updatedAt: new Date() };
      return tokenRows[idx];
    });
    prisma.reviewToken.updateMany.mockImplementation(
      async ({ where, data }: any) => {
        let count = 0;
        tokenRows.forEach((row, idx) => {
          const match =
            (where.tokenHash ? row.tokenHash === where.tokenHash : true) &&
            (where.status ? row.status === where.status : true);
          if (match) {
            tokenRows[idx] = { ...row, ...data, updatedAt: new Date() };
            count++;
          }
        });
        return { count };
      }
    );
    prisma.reviewEvent.create.mockImplementation(async ({ data }: any) => {
      const row = {
        id: `re_${eventRows.length + 1}`,
        ...data,
        createdAt: new Date(),
      };
      eventRows.push(row);
      return row;
    });
  });

  it('creates review link with raw token url and hashed storage key', async () => {
    const result = await service.createReviewLink('org-1', 'post-1');

    expect(result?.token).toBeDefined();
    expect(result?.url).toContain(`/share/${result?.token}`);
    expect(result?.status).toBe('PENDING');
    expect(redisMock.set).toHaveBeenCalled();
    expect(temporalStart).toHaveBeenCalledWith(
      'externalReviewWorkflow',
      expect.objectContaining({
        args: [
          expect.objectContaining({
            token: result?.token,
          }),
        ],
      })
    );
  });

  it('approves with reviewer identity and creates review comment', async () => {
    const created = await service.createReviewLink('org-1', 'post-1');
    const decision = await service.decide(created!.token, 'approve', undefined, {
      reviewerName: 'Alice',
      reviewerEmail: 'alice@example.com',
      ip: '127.0.0.1',
      userAgent: 'jest',
    });

    expect(decision.ok).toBe(true);
    expect(decision.status).toBe('APPROVED');
    expect(prisma.comments.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          content: expect.stringContaining(
            'Post approved by Alice <alice@example.com>'
          ),
        }),
      })
    );
    expect(notificationService.inAppNotification).toHaveBeenCalled();
    expect(temporalService.client.getWorkflowHandle).toHaveBeenCalled();
    expect(temporalSignal).toHaveBeenCalledWith('externalReviewResolved', {
      status: 'APPROVED',
    });
  });

  it('rejects and stores feedback', async () => {
    const created = await service.createReviewLink('org-1', 'post-1');
    const decision = await service.decide(
      created!.token,
      'reject',
      'Please change copy',
      {
        reviewerName: 'Bob',
      }
    );

    expect(decision.ok).toBe(true);
    expect(decision.status).toBe('REJECTED');
    expect(decision.feedback).toBe('Please change copy');
    expect(prisma.comments.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          content: expect.stringContaining('Please change copy'),
        }),
      })
    );
  });

  it('returns not found for invalid token decision', async () => {
    const decision = await service.decide('not-a-token', 'approve');

    expect(decision.ok).toBe(false);
    expect(decision.code).toBe(404);
  });

  it('is idempotent on replayed decisions', async () => {
    const created = await service.createReviewLink('org-1', 'post-1');
    const first = await service.decide(created!.token, 'approve', undefined, {
      reviewerName: 'Alice',
    });
    const second = await service.decide(created!.token, 'approve');

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(false);
    expect(second.code).toBe(409);
    expect(second.status).toBe('APPROVED');
  });

  it('signals workflow resolution on revoke', async () => {
    await service.createReviewLink('org-1', 'post-1');
    const revoked = await service.revokeActiveReview('org-1', 'post-1');

    expect(revoked.ok).toBe(true);
    expect(temporalSignal).toHaveBeenCalledWith('externalReviewResolved', {
      status: 'REVOKED',
    });
  });

  it('expires old pending links and blocks approve', async () => {
    postsService.getPostsRecursively.mockResolvedValue([
      { id: 'p1', publishDate: '2020-01-01T00:00:00.000Z' },
    ]);

    const created = await service.createReviewLink('org-1', 'post-1');
    const decision = await service.decide(created!.token, 'approve');

    expect(decision.ok).toBe(false);
    expect(decision.code).toBe(409);
    expect(decision.status).toBe('EXPIRED');
  });

  it('sanitizes public review payload fields', async () => {
    postsService.getPostsRecursively.mockResolvedValue([
      {
        id: 'p1',
        publishDate: '2026-02-26T10:00:00.000Z',
        content: 'Post content',
        image: '[]',
        childrenPost: [{ id: 'child' }],
        integration: {
          id: 'i1',
          name: 'LinkedIn',
          picture: 'pic',
          providerIdentifier: 'linkedin',
          profile: 'acme',
          token: 'secret-token',
          accessToken: 'secret-access',
        },
      },
    ]);

    const created = await service.createReviewLink('org-1', 'post-1');
    const review = await service.getReviewByToken(created!.token);

    expect(review?.posts?.[0]?.childrenPost).toBeUndefined();
    expect(review?.posts?.[0]?.integration?.id).toBe('i1');
    expect(review?.posts?.[0]?.integration?.name).toBe('LinkedIn');
    expect(review?.posts?.[0]?.integration?.token).toBeUndefined();
    expect(review?.posts?.[0]?.integration?.accessToken).toBeUndefined();
  });

  it('sends reminder only for pending tokens', async () => {
    const created = await service.createReviewLink('org-1', 'post-1');
    const reminder = await service.sendReminderIfPending(created!.token);

    expect(reminder.ok).toBe(true);
    expect(reminder.skipped).toBe(false);
    expect(notificationService.inAppNotification).toHaveBeenCalledWith(
      'org-1',
      'External review reminder',
      expect.any(String),
      false,
      false,
      'info'
    );
  });

  it('expires pending token from workflow activity path', async () => {
    const created = await service.createReviewLink('org-1', 'post-1');
    const expired = await service.expireIfPending(created!.token);
    const readBack = await service.getTokenPayload(created!.token);

    expect(expired.ok).toBe(true);
    expect(expired.skipped).toBe(false);
    expect(readBack?.status).toBe('EXPIRED');
  });
});
