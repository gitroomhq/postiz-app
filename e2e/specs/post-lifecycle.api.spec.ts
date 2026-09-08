import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { testPrisma } from '@gitroom/testing/prisma/test.database';
import { BACKEND, expect, test } from '../fixtures';

dayjs.extend(utc);

/**
 * The states a post moves through in the real stack, with the real workflow
 * running behind them. The unit and integration suites cover each transition in
 * isolation; this is the one place a stale workflow or a mis-set state shows up
 * as it would for a user.
 */
test.describe('post lifecycle API', () => {
  const headers = (org: { token: string; organization: { id: string } }) => ({
    auth: org.token,
    showorg: org.organization.id,
  });

  const postBody = (
    integrationId: string,
    over: Record<string, unknown> = {}
  ) => ({
    type: 'schedule',
    shortLink: false,
    tags: [],
    date: dayjs().add(2, 'day').utc().format('YYYY-MM-DDTHH:mm:ss'),
    posts: [
      {
        integration: { id: integrationId },
        value: [{ content: `e2e lifecycle ${Date.now()}`, image: [] }],
        settings: {},
      },
    ],
    ...over,
  });

  test('saves a draft, promotes it to a schedule, then deletes it', async ({
    org,
    request,
  }) => {
    const created = await request.post(`${BACKEND}/posts`, {
      headers: headers(org),
      data: postBody(org.integration.id, { type: 'draft' }),
    });
    expect(created.ok(), await created.text()).toBeTruthy();

    const [{ postId }] = await created.json();
    await expect
      .poll(async () => (await testPrisma().post.findUnique({ where: { id: postId } }))?.state)
      .toBe('DRAFT');

    // A date move on a draft deliberately leaves it a draft: dragging a card
    // on the calendar must never queue it for publishing.
    const moved = await request.put(`${BACKEND}/posts/${postId}/date`, {
      headers: headers(org),
      data: {
        date: dayjs().add(3, 'day').utc().format('YYYY-MM-DDTHH:mm:ss'),
        action: 'schedule',
      },
    });
    expect(moved.ok(), await moved.text()).toBeTruthy();
    expect(
      (await testPrisma().post.findUniqueOrThrow({ where: { id: postId } })).state
    ).toBe('DRAFT');

    // Promoting is an explicit status change.
    const promoted = await request.put(`${BACKEND}/public/v1/posts/${postId}/status`, {
      headers: { authorization: org.organization.apiKey as string },
      data: { status: 'schedule' },
    });
    expect(promoted.ok(), await promoted.text()).toBeTruthy();

    const post = await testPrisma().post.findUniqueOrThrow({ where: { id: postId } });
    expect(post.state).toBe('QUEUE');

    const deleted = await request.delete(`${BACKEND}/posts/${post.group}`, {
      headers: headers(org),
    });
    expect(deleted.ok(), await deleted.text()).toBeTruthy();

    const after = await testPrisma().post.findUniqueOrThrow({ where: { id: postId } });
    expect(after.deletedAt).not.toBeNull();
  });

  test('refuses to schedule a post in the past', async ({ org, request }) => {
    const response = await request.post(`${BACKEND}/posts`, {
      headers: headers(org),
      data: postBody(org.integration.id, {
        date: dayjs().subtract(1, 'day').utc().format('YYYY-MM-DDTHH:mm:ss'),
      }),
    });

    // Saving it would publish within seconds of the request returning.
    expect(response.status()).toBe(400);
    expect(await response.text()).toContain('in the past');
  });

  test('never shows a post to a user from another organization', async ({
    org,
    request,
  }) => {
    const created = await request.post(`${BACKEND}/posts`, {
      headers: headers(org),
      data: postBody(org.integration.id, { type: 'draft' }),
    });
    const [{ postId }] = await created.json();

    const { createOrgWithUser } = await import(
      '@gitroom/testing/factories/organization.factory'
    );
    const stranger = await createOrgWithUser();

    const response = await request.get(`${BACKEND}/posts/${postId}`, {
      headers: { auth: stranger.token, showorg: stranger.organization.id },
    });

    // The route answers, but with nothing of the other organization's post in
    // it - the repository scopes every read by organization.
    const body = await response.json();
    expect(body.posts ?? []).toEqual([]);
  });

  test('updates only the settings of a scheduled post, leaving its date alone', async ({
    org,
    request,
  }) => {
    const created = await request.post(`${BACKEND}/posts`, {
      headers: headers(org),
      data: postBody(org.integration.id),
    });
    const [{ postId }] = await created.json();
    const before = await testPrisma().post.findUniqueOrThrow({ where: { id: postId } });

    const updated = await request.put(
      `${BACKEND}/public/v1/posts/${postId}/settings`,
      {
        headers: { authorization: org.organization.apiKey as string },
        data: { settings: { spoilerText: 'heads up' } },
      }
    );
    expect(updated.ok(), await updated.text()).toBeTruthy();

    const after = await testPrisma().post.findUniqueOrThrow({ where: { id: postId } });
    // A changed publish date here would move the post out from under the
    // workflow that is already sleeping until the original one.
    expect(after.publishDate.toISOString()).toBe(before.publishDate.toISOString());
    expect(JSON.parse(after.settings || '{}')).toMatchObject({ spoilerText: 'heads up' });
  });

  test('creates a thread as one group', async ({ org, request }) => {
    const created = await request.post(`${BACKEND}/posts`, {
      headers: headers(org),
      data: postBody(org.integration.id, {
        type: 'draft',
        posts: [
          {
            integration: { id: org.integration.id },
            value: [
              { content: 'e2e thread root', image: [] },
              { content: 'e2e thread comment', image: [] },
            ],
            settings: {},
          },
        ],
      }),
    });
    const [{ postId }] = await created.json();

    const root = await testPrisma().post.findUniqueOrThrow({ where: { id: postId } });
    const group = await testPrisma().post.findMany({
      where: { group: root.group },
      orderBy: { createdAt: 'asc' },
    });

    expect(group).toHaveLength(2);
    expect(group[1].parentPostId).toBe(postId);
  });
});
