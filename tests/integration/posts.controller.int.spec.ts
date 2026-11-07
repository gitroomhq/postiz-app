import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

import { DatabaseModule } from '@gitroom/nestjs-libraries/database/prisma/database.module';
import { PostsController } from '@gitroom/backend/api/routes/posts.controller';
import { AgentGraphService } from '@gitroom/nestjs-libraries/agent/agent.graph.service';
import { createTestApp } from '@gitroom/testing/nest/create.test.app';
import {
  createIntegration,
  createOrgWithUser,
} from '@gitroom/testing/factories/organization.factory';
import {
  disconnectTestPrisma,
  resetDatabase,
  testPrisma,
} from '@gitroom/testing/prisma/test.database';

dayjs.extend(utc);

/**
 * The whole create path against real rows: DTO validation, the server-side
 * provider validation the controller runs before saving, and what
 * PostsRepository actually writes. A unit test with a mocked repository cannot
 * see the row that comes out the other end.
 */
describe('PostsController (integration)', () => {
  let app: INestApplication;
  let org: Awaited<ReturnType<typeof createOrgWithUser>>;
  let integrationId: string;

  const future = (days = 2) =>
    dayjs.utc().add(days, 'day').format('YYYY-MM-DDTHH:mm:ss');

  const body = (over: Record<string, unknown> = {}) => ({
    type: 'schedule',
    date: future(),
    shortLink: false,
    tags: [],
    order: '',
    posts: [
      {
        integration: { id: integrationId },
        settings: {},
        value: [{ content: 'hello from the integration suite', image: [] }],
      },
    ],
    ...over,
  });

  beforeAll(async () => {
    ({ app } = await createTestApp({
      imports: [DatabaseModule],
      controllers: [PostsController],
      policies: false,
      // The real graph service boots Mastra and an OpenAI client, and lives
      // outside DatabaseModule; the routes under test never reach it.
      providers: [
        { provide: AgentGraphService, useValue: { start: async function* () {} } },
      ],
      middleware: [
        (req, _res, next) => {
          req.org = org.organization;
          req.user = org.user;
          next();
        },
      ],
    }));
  }, 60_000);

  afterAll(async () => {
    await app?.close();
    await disconnectTestPrisma();
  });

  beforeEach(async () => {
    await resetDatabase();
    org = await createOrgWithUser();
    integrationId = (await createIntegration(org.organization.id)).id;
  });

  it('writes a queued post the calendar can read back', async () => {
    const response = await request(app.getHttpServer())
      .post('/posts')
      .send(body())
      .expect(201);

    expect(response.body).toEqual([
      { postId: expect.any(String), integration: integrationId },
    ]);

    const saved = await testPrisma().post.findUniqueOrThrow({
      where: { id: response.body[0].postId },
    });
    expect(saved).toMatchObject({
      organizationId: org.organization.id,
      integrationId,
      state: 'QUEUE',
      content: expect.stringContaining('hello from the integration suite'),
    });
  });

  it('saves a draft without queueing it for publishing', async () => {
    const response = await request(app.getHttpServer())
      .post('/posts')
      .send(body({ type: 'draft' }))
      .expect(201);

    const saved = await testPrisma().post.findUniqueOrThrow({
      where: { id: response.body[0].postId },
    });
    expect(saved.state).toBe('DRAFT');
  });

  it('refuses an empty post with the provider name the toast shows', async () => {
    const response = await request(app.getHttpServer())
      .post('/posts')
      .send(
        body({
          posts: [
            {
              integration: { id: integrationId },
              settings: {},
              value: [{ content: '', image: [] }],
            },
          ],
        })
      )
      .expect(400);

    expect(response.body).toEqual({
      statusCode: 400,
      provider: 'mastodon',
      name: 'Test Mastodon',
      message: expect.stringContaining('at least one character'),
    });
    expect(await testPrisma().post.count()).toBe(0);
  });

  it('refuses a post that is longer than the provider allows', async () => {
    const response = await request(app.getHttpServer())
      .post('/posts')
      .send(
        body({
          posts: [
            {
              integration: { id: integrationId },
              settings: {},
              value: [{ content: 'x'.repeat(6000), image: [] }],
            },
          ],
        })
      )
      .expect(400);

    expect(response.body.message).toContain('too long');
  });

  it('lets an over-long draft through, because a draft is never published', async () => {
    await request(app.getHttpServer())
      .post('/posts')
      .send(
        body({
          type: 'draft',
          posts: [
            {
              integration: { id: integrationId },
              settings: {},
              value: [{ content: 'x'.repeat(6000), image: [] }],
            },
          ],
        })
      )
      .expect(201);
  });

  it('refuses a schedule dated in the past rather than publishing immediately', async () => {
    const response = await request(app.getHttpServer())
      .post('/posts')
      .send(body({ date: dayjs.utc().subtract(1, 'day').format('YYYY-MM-DDTHH:mm:ss') }))
      .expect(400);

    expect(response.body.message).toContain('in the past');
    expect(await testPrisma().post.count()).toBe(0);
  });

  it('refuses a post for a channel in another organization', async () => {
    const other = await createOrgWithUser();
    const foreign = await createIntegration(other.organization.id);

    await request(app.getHttpServer())
      .post('/posts')
      .send(
        body({
          posts: [
            {
              integration: { id: foreign.id },
              settings: {},
              value: [{ content: 'hello', image: [] }],
            },
          ],
        })
      )
      .expect(400);

    expect(await testPrisma().post.count()).toBe(0);
  });

  it('rejects a body the DTO cannot accept', async () => {
    await request(app.getHttpServer())
      .post('/posts')
      .send({ type: 'schedule', posts: [] })
      .expect(400);
  });

  it('stores a thread as a parent post with its comment attached', async () => {
    const response = await request(app.getHttpServer())
      .post('/posts')
      .send(
        body({
          posts: [
            {
              integration: { id: integrationId },
              settings: {},
              value: [
                { content: 'the main post', image: [] },
                { content: 'the first comment', image: [] },
              ],
            },
          ],
        })
      )
      .expect(201);

    const posts = await testPrisma().post.findMany({ orderBy: { createdAt: 'asc' } });
    expect(posts).toHaveLength(2);
    expect(posts[1].parentPostId).toBe(response.body[0].postId);
  });

  it('returns the saved post through the read route', async () => {
    const created = await request(app.getHttpServer()).post('/posts').send(body()).expect(201);

    const response = await request(app.getHttpServer())
      .get(`/posts/${created.body[0].postId}`)
      .expect(200);

    expect(response.body.posts[0].content).toContain('hello from the integration suite');
    expect(response.body.integration).toBe(integrationId);
  });

  it('lists the posts of the organization for the calendar window', async () => {
    await request(app.getHttpServer()).post('/posts').send(body()).expect(201);

    const response = await request(app.getHttpServer())
      .get('/posts')
      .query({
        startDate: dayjs.utc().toISOString(),
        endDate: dayjs.utc().add(30, 'day').toISOString(),
      })
      .expect(200);

    // The calendar payload is minified, so the posts land under `p`.
    expect(response.body.p).toHaveLength(1);
  });

  it('never returns another organization’s post', async () => {
    const other = await createOrgWithUser();
    const foreign = await createIntegration(other.organization.id);
    await testPrisma().post.create({
      data: {
        organizationId: other.organization.id,
        integrationId: foreign.id,
        content: 'not yours',
        publishDate: dayjs.utc().add(1, 'day').toDate(),
        group: 'other-group',
        state: 'QUEUE',
        releaseURL: '',
      },
    });

    const response = await request(app.getHttpServer())
      .get('/posts/group/other-group')
      .expect(200);

    expect(response.body.posts).toEqual([]);
  });

  it('moves a queued post to a new date', async () => {
    const created = await request(app.getHttpServer()).post('/posts').send(body()).expect(201);
    const newDate = future(5);

    await request(app.getHttpServer())
      .put(`/posts/${created.body[0].postId}/date`)
      .send({ date: newDate, action: 'schedule' })
      .expect(200);

    const saved = await testPrisma().post.findUniqueOrThrow({
      where: { id: created.body[0].postId },
    });
    expect(dayjs.utc(saved.publishDate).format('YYYY-MM-DDTHH:mm:ss')).toBe(newDate);
  });

  it('defaults a date move to update, so a client that sends no action cannot requeue', async () => {
    const created = await request(app.getHttpServer())
      .post('/posts')
      .send(body({ type: 'draft' }))
      .expect(201);

    await request(app.getHttpServer())
      .put(`/posts/${created.body[0].postId}/date`)
      .send({ date: future(5) })
      .expect(200);

    const saved = await testPrisma().post.findUniqueOrThrow({
      where: { id: created.body[0].postId },
    });
    // A silent requeue here is what republishes a post the user only dragged.
    expect(saved.state).toBe('DRAFT');
  });

  it('soft-deletes the whole group', async () => {
    const created = await request(app.getHttpServer()).post('/posts').send(body()).expect(201);
    const saved = await testPrisma().post.findUniqueOrThrow({
      where: { id: created.body[0].postId },
    });

    await request(app.getHttpServer()).delete(`/posts/${saved.group}`).expect(200);

    const after = await testPrisma().post.findUniqueOrThrow({ where: { id: saved.id } });
    expect(after.deletedAt).not.toBeNull();
  });

  it('reports validation results without saving anything', async () => {
    const response = await request(app.getHttpServer())
      .post('/posts/valid')
      .send({
        posts: [
          { integration: { id: integrationId }, settings: {}, value: [{ content: '' }] },
        ],
      })
      .expect(201);

    expect(response.body[0]).toMatchObject({
      id: integrationId,
      identifier: 'mastodon',
      emptyContent: true,
    });
    expect(await testPrisma().post.count()).toBe(0);
  });

  it('creates, lists and deletes a tag', async () => {
    const created = await request(app.getHttpServer())
      .post('/posts/tags')
      .send({ name: 'Launch', color: '#ff0000' })
      .expect(201);

    const list = await request(app.getHttpServer()).get('/posts/tags').expect(200);
    expect(list.body.tags).toMatchObject([{ id: created.body.id, name: 'Launch' }]);

    await request(app.getHttpServer()).delete(`/posts/tags/${created.body.id}`).expect(200);

    const after = await request(app.getHttpServer()).get('/posts/tags').expect(200);
    expect(after.body.tags).toEqual([]);
  });
});
