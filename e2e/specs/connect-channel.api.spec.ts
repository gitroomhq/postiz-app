import { testPrisma } from '@gitroom/testing/prisma/test.database';
import { BACKEND, expect, test } from '../fixtures';


/**
 * The one spec that drives the real OAuth callback rather than seeding an
 * Integration row, so the connect path itself stays covered. The provider's
 * token and account endpoints are served by the mock instance.
 */
test('connects a Mastodon channel through the real OAuth callback', async ({
  org,
  mock,
  request,
}) => {
  // 1. Ask the backend for the provider's auth URL. This also stashes the
  //    state in Redis, which the callback below needs.
  const authUrlResponse = await request.get(
    `${BACKEND}/integrations/social/mastodon`,
    { headers: { auth: org.token, showorg: org.organization.id } }
  );
  expect(authUrlResponse.ok(), await authUrlResponse.text()).toBeTruthy();

  const { url } = await authUrlResponse.json();
  const state = new URL(url).searchParams.get('state');
  expect(state).toBeTruthy();

  // 2. Complete the callback. This route is on NoAuthIntegrationsController and
  //    PoliciesGuard explicitly bypasses paths containing
  //    /integrations/social-connect, so it takes no auth header.
  const connectResponse = await request.post(
    `${BACKEND}/integrations/social-connect/mastodon`,
    // ConnectIntegrationDto requires timezone alongside code and state.
    { data: { code: 'mock-authorization-code', state, timezone: '0' } }
  );
  expect(connectResponse.ok(), await connectResponse.text()).toBeTruthy();

  // 3. The provider was really contacted for a token and an account.
  expect((await mock.requestsTo('/oauth/token')).length).toBeGreaterThan(0);
  expect(
    (await mock.requestsTo('/api/v1/accounts/verify_credentials')).length
  ).toBeGreaterThan(0);

  // 4. A channel now exists carrying the token the mock handed out.
  const integrations = await testPrisma().integration.findMany({
    where: { organizationId: org.organization.id, providerIdentifier: 'mastodon' },
  });
  expect(integrations.length).toBeGreaterThan(1); // the seeded one plus this
  expect(integrations.some((i) => i.token === 'e2e-mastodon-token')).toBe(true);
});
