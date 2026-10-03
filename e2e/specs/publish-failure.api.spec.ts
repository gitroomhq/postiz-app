import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { testPrisma } from '@gitroom/testing/prisma/test.database';
import { BACKEND, expect, test } from '../fixtures';

dayjs.extend(utc);

/**
 * The other half of the flagship publish spec: what the user sees when the
 * provider refuses the post. The publish path is only trustworthy if a rejected
 * post fails visibly and, above all, is never published a second time.
 */
test('a rejected post is marked failed and never published twice', async ({
  org,
  mock,
  request,
}) => {
  const content = `e2e rejected ${Date.now()}`;

  // Mastodon answers 422 for a status it will never accept; the provider maps
  // that to a terminal BadBody rather than something the workflow retries.
  await mock.program([
    { path: '/api/v1/statuses', status: 422, body: { error: 'Validation failed' } },
  ]);

  const response = await request.post(`${BACKEND}/posts`, {
    headers: { auth: org.token, showorg: org.organization.id },
    data: {
      type: 'schedule',
      shortLink: false,
      tags: [],
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

  await expect
    .poll(
      async () =>
        (
          await testPrisma().post.findFirst({
            where: { organizationId: org.organization.id },
            orderBy: { createdAt: 'desc' },
          })
        )?.state,
      {
        timeout: 120_000,
        message: 'expected the workflow to record the rejection as an error',
      }
    )
    .toBe('ERROR');

  // A retry loop here would post the same status again the moment Mastodon
  // started accepting it.
  expect((await mock.requestsTo('/api/v1/statuses')).length).toBe(1);

  const failed = await testPrisma().post.findFirstOrThrow({
    where: { organizationId: org.organization.id },
    orderBy: { createdAt: 'desc' },
  });
  expect(failed.releaseURL).toBeFalsy();
});
