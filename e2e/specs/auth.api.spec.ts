import { randomUUID } from 'node:crypto';
import { BACKEND, expect, test } from '../fixtures';


test.describe('authentication API', () => {
  test('registers a new user and returns a session', async ({ request }) => {
    const response = await request.post(`${BACKEND}/auth/register`, {
      data: {
        email: `e2e-${randomUUID()}@postiz.test`,
        password: 'E2ePassw0rd!',
        company: 'E2E Co',
        provider: 'LOCAL',
      },
    });

    expect(response.status(), await response.text()).toBeLessThan(400);
  });

  test('rejects a login with the wrong password', async ({ org, request }) => {
    const response = await request.post(`${BACKEND}/auth/login`, {
      data: {
        email: org.user.email,
        password: 'definitely-not-the-password',
        provider: 'LOCAL',
      },
    });

    expect(response.status()).toBe(400);
  });

  test('accepts a login with the seeded password', async ({ org, request }) => {
    const response = await request.post(`${BACKEND}/auth/login`, {
      data: { email: org.user.email, password: 'E2ePassw0rd!', provider: 'LOCAL' },
    });

    expect(response.status(), await response.text()).toBeLessThan(400);
  });

  test('refuses an unauthenticated request to a protected route', async ({
    request,
  }) => {
    const response = await request.get(`${BACKEND}/user/self`);

    expect(response.status()).toBe(401);
  });

  test('accepts an authenticated request to a protected route', async ({
    org,
    request,
  }) => {
    const response = await request.get(`${BACKEND}/user/self`, {
      headers: { auth: org.token, showorg: org.organization.id },
    });

    expect(response.ok(), await response.text()).toBeTruthy();
  });
});

test.describe('public API', () => {
  test('rejects a request with no API key', async ({ request }) => {
    const response = await request.get(`${BACKEND}/public/v1/posts`);

    expect(response.status()).toBe(401);
    expect(await response.json()).toMatchObject({ msg: 'No API Key found' });
  });
});
