import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  INestApplication,
  MiddlewareConsumer,
  Module,
  NestModule,
} from '@nestjs/common';
import request from 'supertest';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

import { DatabaseModule } from '@gitroom/nestjs-libraries/database/prisma/database.module';
import { PublicIntegrationsController } from '@gitroom/backend/public-api/routes/v1/public.integrations.controller';
import { PublicAuthMiddleware } from '@gitroom/backend/services/auth/public.auth.middleware';
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

@Module({
  imports: [DatabaseModule],
  controllers: [PublicIntegrationsController],
})
class PublicApiModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(PublicAuthMiddleware).forRoutes(PublicIntegrationsController);
  }
}

/**
 * The /public/v1 surface as an API consumer sees it: a real API key resolved by
 * PublicAuthMiddleware, the same server-side validation as the dashboard, and
 * real rows written and read back. This is the path automations use, and the
 * one where a regression is invisible in the UI.
 */
describe('Public API v1 posts (integration)', () => {
  let app: INestApplication;
  let org: Awaited<ReturnType<typeof createOrgWithUser>>;
  let apiKey: string;
  let integrationId: string;

  const auth = () => request(app.getHttpServer());

  const body = (over: Record<string, unknown> = {}) => ({
    type: 'schedule',
    date: dayjs.utc().add(2, 'day').format('YYYY-MM-DDTHH:mm:ss'),
    shortLink: false,
    tags: [],
    posts: [
      {
        integration: { id: integrationId },
        settings: {},
        value: [{ content: 'hello from the public api', image: [] }],
      },
    ],
    ...over,
  });

  beforeAll(async () => {
    ({ app } = await createTestApp({ imports: [PublicApiModule], policies: false }));
  }, 60_000);

  afterAll(async () => {
    await app?.close();
    await disconnectTestPrisma();
  });

  beforeEach(async () => {
    await resetDatabase();
    org = await createOrgWithUser();
    // getOrgByApiKey matches the stored column verbatim, so the header carries
    // exactly what is in the row.
    apiKey = org.organization.apiKey!;
    integrationId = (await createIntegration(org.organization.id)).id;
  });

  it('refuses every route without an api key', async () => {
    await auth().get('/public/v1/posts').expect(401);
    await auth().post('/public/v1/posts').send(body()).expect(401);
  });

  it('lists the connected channels', async () => {
    const response = await auth()
      .get('/public/v1/integrations')
      .set('authorization', apiKey)
      .expect(200);

    expect(response.body).toMatchObject([
      { id: integrationId, name: 'Test Mastodon', identifier: 'mastodon' },
    ]);
  });

  it('creates a post and writes it to the organization', async () => {
    const response = await auth()
      .post('/public/v1/posts')
      .set('authorization', apiKey)
      .send(body())
      .expect(201);

    const saved = await testPrisma().post.findUniqueOrThrow({
      where: { id: response.body[0].postId },
    });
    expect(saved).toMatchObject({
      organizationId: org.organization.id,
      integrationId,
      state: 'QUEUE',
    });
  });

  it('records the post as created through the API', async () => {
    const response = await auth()
      .post('/public/v1/posts')
      .set('authorization', apiKey)
      .send(body())
      .expect(201);

    const saved = await testPrisma().post.findUniqueOrThrow({
      where: { id: response.body[0].postId },
    });
    expect(saved.creationMethod).toBe('API');
  });

  it('accepts CLI as a creation method but nothing else', async () => {
    const cli = await auth()
      .post('/public/v1/posts')
      .set('authorization', apiKey)
      .send(body({ creationMethod: 'CLI' }))
      .expect(201);

    const forged = await auth()
      .post('/public/v1/posts')
      .set('authorization', apiKey)
      .send(body({ creationMethod: 'WEB' }))
      .expect(201);

    const rows = await testPrisma().post.findMany({
      where: { id: { in: [cli.body[0].postId, forged.body[0].postId] } },
      orderBy: { createdAt: 'asc' },
    });
    expect(rows.map((r) => r.creationMethod)).toEqual(['CLI', 'API']);
  });

  it('refuses an empty post with the same message the dashboard shows', async () => {
    const response = await auth()
      .post('/public/v1/posts')
      .set('authorization', apiKey)
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

    // mapTypeToPost runs the CreatePostDto through the ValidationPipe before
    // the provider validation is reached, so an empty body is refused by the
    // DTO rather than by the provider check.
    expect(response.body.statusCode).toBe(400);
    expect(await testPrisma().post.count()).toBe(0);
  });

  it('refuses a channel belonging to another organization', async () => {
    const other = await createOrgWithUser();
    const foreign = await createIntegration(other.organization.id);

    // An API key must never reach across organizations, however valid it is.
    await auth()
      .post('/public/v1/posts')
      .set('authorization', apiKey)
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

  it('reads the posts back over the date range', async () => {
    await auth().post('/public/v1/posts').set('authorization', apiKey).send(body()).expect(201);

    const response = await auth()
      .get('/public/v1/posts')
      .set('authorization', apiKey)
      .query({
        startDate: dayjs.utc().toISOString(),
        endDate: dayjs.utc().add(30, 'day').toISOString(),
      })
      .expect(200);

    expect(response.body.posts).toHaveLength(1);
  });

  it('deletes a post by id', async () => {
    const created = await auth()
      .post('/public/v1/posts')
      .set('authorization', apiKey)
      .send(body())
      .expect(201);

    await auth()
      .delete(`/public/v1/posts/${created.body[0].postId}`)
      .set('authorization', apiKey)
      .expect(200);

    const saved = await testPrisma().post.findUniqueOrThrow({
      where: { id: created.body[0].postId },
    });
    expect(saved.deletedAt).not.toBeNull();
  });

  it('answers the connectivity probe', async () => {
    await auth().get('/public/v1/is-connected').set('authorization', apiKey).expect(200);
  });

  it('updates the settings of a scheduled post in place', async () => {
    const created = await auth()
      .post('/public/v1/posts')
      .set('authorization', apiKey)
      .send(body())
      .expect(201);

    await auth()
      .put(`/public/v1/posts/${created.body[0].postId}/settings`)
      .set('authorization', apiKey)
      .send({ settings: { subreddit: [] } })
      .expect(200);

    const saved = await testPrisma().post.findUniqueOrThrow({
      where: { id: created.body[0].postId },
    });
    // The publish date is untouched, so the running workflow is left alone.
    expect(saved.state).toBe('QUEUE');
  });
});
