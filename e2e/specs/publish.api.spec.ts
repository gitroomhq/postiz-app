import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { testPrisma } from '@gitroom/testing/prisma/test.database';
import { BACKEND, expect, test } from '../fixtures';

dayjs.extend(utc);


/**
 * The flagship end-to-end assertion: a post created through the real API is
 * picked up by the real Temporal workflow, published by the real provider code,
 * and the only thing standing in for production is the Mastodon instance
 * itself.
 */
test('a scheduled post reaches the provider and is marked published', async ({
  org,
  mock,
  request,
}) => {
  const content = `e2e post ${Date.now()}`;

  const response = await request.post(`${BACKEND}/posts`, {
    headers: { auth: org.token, showorg: org.organization.id },
    data: {
      type: 'schedule',
      shortLink: false,
      tags: [],
      // A few seconds out so the workflow exercises its scheduling sleep
      // rather than the postNow shortcut.
      date: dayjs().add(5, 'second').utc().format('YYYY-MM-DDTHH:mm:ss'),
      posts: [
        {
          integration: { id: org.integration.id },
          value: [{ content, image: [] }],
          settings: {},
        },
      ],
    },
  });

  expect(response.ok(), await response.text()).toBeTruthy();

  // The provider actually got called...
  await expect
    .poll(async () => (await mock.requestsTo('/api/v1/statuses')).length, {
      timeout: 120_000,
      message: 'expected the orchestrator to publish the post to Mastodon',
    })
    .toBeGreaterThan(0);

  const [published] = await mock.requestsTo('/api/v1/statuses');
  expect(JSON.stringify(published.body)).toContain(content);

  // ...and the post is recorded as published, with a release URL.
  await expect
    .poll(
      async () => {
        const post = await testPrisma().post.findFirst({
          where: { organizationId: org.organization.id },
          orderBy: { createdAt: 'desc' },
        });
        return post?.state;
      },
      { timeout: 60_000, message: 'expected the post to reach PUBLISHED' }
    )
    .toBe('PUBLISHED');

  const post = await testPrisma().post.findFirst({
    where: { organizationId: org.organization.id },
    orderBy: { createdAt: 'desc' },
  });
  expect(post?.releaseURL).toContain('/statuses/');
});
