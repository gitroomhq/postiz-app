import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { testPrisma } from '@gitroom/testing/prisma/test.database';
import { BACKEND, expect, test } from '../fixtures';

dayjs.extend(utc);

/**
 * The /public/v1 surface against the running backend, as an automation using an
 * API key sees it. The integration suite covers the same routes in-process; this
 * proves the middleware, guards and swagger-facing routes are actually wired
 * into the booted application.
 */
test.describe('public API v1', () => {
  const key = (org: { organization: { apiKey: string | null } }) => ({
    authorization: org.organization.apiKey as string,
  });

  test('lists the channels of the key’s organization', async ({ org, request }) => {
    const response = await request.get(`${BACKEND}/public/v1/integrations`, {
      headers: key(org),
    });

    expect(response.ok(), await response.text()).toBeTruthy();
    expect(await response.json()).toContainEqual(
      expect.objectContaining({ id: org.integration.id, identifier: 'mastodon' })
    );
  });

  test('creates a post recorded as coming from the API', async ({ org, request }) => {
    const response = await request.post(`${BACKEND}/public/v1/posts`, {
      headers: key(org),
      data: {
        type: 'draft',
        shortLink: false,
        tags: [],
        date: dayjs().add(2, 'day').utc().format('YYYY-MM-DDTHH:mm:ss'),
        posts: [
          {
            integration: { id: org.integration.id },
            value: [{ content: `e2e public api ${Date.now()}`, image: [] }],
            settings: {},
          },
        ],
      },
    });

    expect(response.ok(), await response.text()).toBeTruthy();
    const [{ postId }] = await response.json();

    const saved = await testPrisma().post.findUniqueOrThrow({ where: { id: postId } });
    expect(saved.creationMethod).toBe('API');
    expect(saved.organizationId).toBe(org.organization.id);
  });

  test('reads back the posts of the organization', async ({ org, request }) => {
    await request.post(`${BACKEND}/public/v1/posts`, {
      headers: key(org),
      data: {
        type: 'draft',
        shortLink: false,
        tags: [],
        date: dayjs().add(2, 'day').utc().format('YYYY-MM-DDTHH:mm:ss'),
        posts: [
          {
            integration: { id: org.integration.id },
            value: [{ content: `e2e public api list ${Date.now()}`, image: [] }],
            settings: {},
          },
        ],
      },
    });

    const response = await request.get(`${BACKEND}/public/v1/posts`, {
      headers: key(org),
      params: {
        startDate: dayjs().utc().toISOString(),
        endDate: dayjs().add(30, 'day').utc().toISOString(),
      },
    });

    expect(response.ok(), await response.text()).toBeTruthy();
    expect((await response.json()).posts.length).toBeGreaterThan(0);
  });

  test('refuses a channel that belongs to another organization', async ({
    org,
    request,
  }) => {
    const { createIntegration, createOrgWithUser } = await import(
      '@gitroom/testing/factories/organization.factory'
    );
    const other = await createOrgWithUser();
    const foreign = await createIntegration(other.organization.id);

    const response = await request.post(`${BACKEND}/public/v1/posts`, {
      headers: key(org),
      data: {
        type: 'draft',
        shortLink: false,
        tags: [],
        date: dayjs().add(2, 'day').utc().format('YYYY-MM-DDTHH:mm:ss'),
        posts: [
          {
            integration: { id: foreign.id },
            value: [{ content: 'should never be saved', image: [] }],
            settings: {},
          },
        ],
      },
    });

    // An API key must never reach across organizations, however valid it is.
    expect(response.status()).toBe(400);
  });

  test('deletes a post through the API', async ({ org, request }) => {
    const created = await request.post(`${BACKEND}/public/v1/posts`, {
      headers: key(org),
      data: {
        type: 'draft',
        shortLink: false,
        tags: [],
        date: dayjs().add(2, 'day').utc().format('YYYY-MM-DDTHH:mm:ss'),
        posts: [
          {
            integration: { id: org.integration.id },
            value: [{ content: `e2e public api delete ${Date.now()}`, image: [] }],
            settings: {},
          },
        ],
      },
    });
    const [{ postId }] = await created.json();

    const deleted = await request.delete(`${BACKEND}/public/v1/posts/${postId}`, {
      headers: key(org),
    });
    expect(deleted.ok(), await deleted.text()).toBeTruthy();

    const saved = await testPrisma().post.findUniqueOrThrow({ where: { id: postId } });
    expect(saved.deletedAt).not.toBeNull();
  });
});
