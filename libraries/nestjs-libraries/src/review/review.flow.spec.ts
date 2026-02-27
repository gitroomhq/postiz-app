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

describe('ReviewService end-to-end flow tests', () => {
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
  const temporalService = {
    client: {
      getRawClient: jest.fn(() => ({
        workflow: {
          start: jest.fn(async () => undefined),
        },
      })),
      getWorkflowHandle: jest.fn(async () => ({
        signal: jest.fn(async () => undefined),
      })),
    },
  } as any;

  let service: ReviewService;

  beforeEach(() => {
    redisStore.clear();
    tokenRows.length = 0;
    eventRows.length = 0;
    jest.clearAllMocks();
    process.env.FRONTEND_URL = 'http://localhost:4200';
    service = new ReviewService(
      postsService,
      prisma,
      notificationService,
      temporalService
    );

    postsService.getPostsRecursively.mockResolvedValue([
      {
        id: 'p1',
        publishDate: '2026-03-01T12:00:00.000Z',
        content: 'content',
        image: '[]',
        integration: {
          id: 'i1',
          name: 'LinkedIn',
          picture: 'pic',
          providerIdentifier: 'linkedin',
          profile: 'acme',
        },
      },
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

  it('create link -> get review -> approve -> replay blocked', async () => {
    const link = await service.createReviewLink('org-1', 'post-1');
    const review = await service.getReviewByToken(link!.token);
    const approve = await service.decide(link!.token, 'approve');
    const replay = await service.decide(link!.token, 'approve');

    expect(review?.status).toBe('PENDING');
    expect(approve.ok).toBe(true);
    expect(approve.status).toBe('APPROVED');
    expect(replay.ok).toBe(false);
    expect(replay.code).toBe(409);
  });

  it('create link -> reject with feedback', async () => {
    const link = await service.createReviewLink('org-1', 'post-1');
    const reject = await service.decide(link!.token, 'reject', 'Need edits');

    expect(reject.ok).toBe(true);
    expect(reject.status).toBe('REJECTED');
    expect(reject.feedback).toBe('Need edits');
  });

  it('pending until expiry -> expires and decision blocked', async () => {
    postsService.getPostsRecursively.mockResolvedValue([
      {
        id: 'p1',
        publishDate: '2020-01-01T00:00:00.000Z',
        content: 'content',
        image: '[]',
        integration: {
          id: 'i1',
          name: 'LinkedIn',
          picture: 'pic',
          providerIdentifier: 'linkedin',
          profile: 'acme',
        },
      },
    ]);

    const link = await service.createReviewLink('org-1', 'post-1');
    const decision = await service.decide(link!.token, 'approve');

    expect(decision.ok).toBe(false);
    expect(decision.status).toBe('EXPIRED');
    expect(prisma.post.updateMany).toHaveBeenCalled();
  });

  it('tampered token is rejected', async () => {
    const decision = await service.decide('tampered-token', 'approve');
    expect(decision.ok).toBe(false);
    expect(decision.code).toBe(404);
  });
});

