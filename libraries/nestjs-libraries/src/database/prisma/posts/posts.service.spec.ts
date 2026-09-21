import { PostsService } from './posts.service';

jest.mock('@sentry/nestjs', () => ({
  metrics: { count: jest.fn() },
}));

// bcrypt's native binding cannot build on this machine; auth only needs it
// for password hashing, which createPost never touches.
jest.mock('bcrypt', () => ({
  hashSync: jest.fn(),
  compareSync: jest.fn(),
}));

// sanitize pulls in isomorphic-dompurify/jsdom (ESM), which jest cannot load
// on this setup; it is only used by DTO validation, not by createPost.
jest.mock('@gitroom/helpers/utils/sanitize.post.content', () => ({
  sanitizePostContent: (value: string) => value,
}));

// The integration manager aggregates every provider (which pulls native
// bcrypt via the auth service); createPost only needs getSocialIntegration,
// injected as a stub below.
jest.mock('@gitroom/nestjs-libraries/integrations/integration.manager', () => ({
  IntegrationManager: jest.fn(),
}));

// The upload factory pulls ESM-only file-type via cloud storage; createPost
// never touches storage (it is only initialized as a field).
jest.mock('@gitroom/nestjs-libraries/upload/upload.factory', () => ({
  UploadFactory: { createStorage: jest.fn(() => ({})) },
}));

// Media validation pulls ESM-only file-type; createPost never validates media.
jest.mock(
  '@gitroom/nestjs-libraries/database/prisma/media/media.service',
  () => ({
    MediaService: jest.fn(),
  })
);

// The remaining injected collaborators are stubbed via the constructor and
// never touched by createPost; mock their modules so their own heavy
// transitive imports stay out of this unit test.
jest.mock('@gitroom/nestjs-libraries/short-linking/short.link.service', () => ({
  ShortLinkService: jest.fn(),
}));
jest.mock('@gitroom/nestjs-libraries/openai/openai.service', () => ({
  OpenaiService: jest.fn(),
}));
jest.mock(
  '@gitroom/nestjs-libraries/integrations/refresh.integration.service',
  () => ({
    RefreshIntegrationService: jest.fn(),
  })
);

type FakeRow = {
  id: string;
  group: string;
  integrationId: string;
  deletedAt: Date | null;
};

type FakeCall = {
  group: string | undefined;
  keepGroup: boolean;
  sweepExcludeIds: string[];
};

// In-memory stand-in for PostsRepository.createOrUpdatePost that mirrors its
// group semantics: a fresh group per call unless keepGroup is set, the
// rotate-and-sweep of caller-group rows otherwise, and the by-id sweep of
// dropped rows when keepGroup is set.
class FakePostsRepository {
  rows: FakeRow[] = [];

  calls: FakeCall[] = [];

  private nextId = 1;

  private uuid() {
    return `fake-id-${this.nextId++}`;
  }

  async getPostById(): Promise<null> {
    return null;
  }

  async createOrUpdatePost(
    _state: string,
    _orgId: string,
    _date: string,
    body: any,
    _tags: any[],
    _creationMethod: string,
    _inter?: number,
    keepGroup = false,
    sweepExcludeIds: string[] = []
  ): Promise<{ previousPost: undefined; posts: FakeRow[] }> {
    const group =
      keepGroup && body.group ? body.group : `fresh-group-${this.uuid()}`;
    const created: FakeRow[] = [];

    for (const value of body.value) {
      const existing = value.id
        ? this.rows.find((r) => r.id === value.id)
        : undefined;
      if (existing) {
        existing.group = group;
        created.push(existing);
      } else {
        const row: FakeRow = {
          id: value.id || this.uuid(),
          group,
          integrationId: body.integration.id,
          deletedAt: null,
        };
        this.rows.push(row);
        created.push(row);
      }
    }

    if (body.group && !keepGroup) {
      for (const row of this.rows) {
        if (row.group === body.group && !row.deletedAt) {
          row.deletedAt = new Date();
        }
      }
    }

    if (body.group && keepGroup) {
      const keep = new Set([...created.map((p) => p.id), ...sweepExcludeIds]);
      for (const row of this.rows) {
        if (row.group === body.group && !row.deletedAt && !keep.has(row.id)) {
          row.deletedAt = new Date();
        }
      }
    }

    this.calls.push({ group: body.group, keepGroup, sweepExcludeIds });
    return { previousPost: undefined, posts: created };
  }

  alive() {
    return this.rows.filter((r) => !r.deletedAt);
  }
}

const makePost = (
  integrationId: string,
  group?: string,
  valueId?: string
): any => ({
  integration: { id: integrationId },
  ...(group ? { group } : {}),
  settings: { __type: 'instagram' },
  value: [
    {
      ...(valueId ? { id: valueId } : {}),
      content: 'hello',
      image: [],
    },
  ],
});

const makeBody = (posts: any[]) => ({
  type: 'draft',
  date: '2026-09-21T09:00:00.000Z',
  shortLink: false,
  tags: [],
  posts,
});

const makeService = (repo: FakePostsRepository) =>
  new PostsService(
    repo as any,
    { getSocialIntegration: () => undefined } as any,
    undefined as any,
    undefined as any,
    undefined as any,
    undefined as any,
    undefined as any,
    undefined as any
  );

describe('PostsService.createPost group handling (public API)', () => {
  test('a multi-channel request sharing one group stays a single group', async () => {
    const repo = new FakePostsRepository();
    const service = makeService(repo);

    await service.createPost(
      'org-1',
      makeBody([
        makePost('int-instagram', 'grp-test-001'),
        makePost('int-facebook', 'grp-test-001'),
      ]) as any,
      'API'
    );

    const alive = repo.alive();
    expect(alive).toHaveLength(2);
    expect(alive[0].group).toBe('grp-test-001');
    expect(alive[1].group).toBe('grp-test-001');
  });

  test('requests without a group keep the legacy per-post groups', async () => {
    const repo = new FakePostsRepository();
    const service = makeService(repo);

    await service.createPost(
      'org-1',
      makeBody([makePost('int-instagram'), makePost('int-facebook')]) as any,
      'API'
    );

    const alive = repo.alive();
    expect(alive).toHaveLength(2);
    expect(alive[0].group).not.toBe(alive[1].group);
  });

  test('edits carrying value ids keep the rotate-and-sweep', async () => {
    const repo = new FakePostsRepository();
    repo.rows.push(
      { id: 'row-1', group: 'g-old', integrationId: 'int-ig', deletedAt: null },
      { id: 'row-2', group: 'g-old', integrationId: 'int-fb', deletedAt: null }
    );
    const service = makeService(repo);

    await service.createPost(
      'org-1',
      {
        ...makeBody([
          makePost('int-ig', 'g-old', 'row-1'),
          makePost('int-fb', 'g-old', 'row-2'),
        ]),
        type: 'schedule',
      } as any,
      'WEB'
    );

    expect(repo.calls.length).toBeGreaterThan(0);
    expect(repo.calls.every((c) => c.keepGroup === false)).toBe(true);
    // The stale sibling row is still swept, exactly like before the fix.
    expect(repo.rows.find((r) => r.id === 'row-2')?.deletedAt).not.toBeNull();
  });
});
