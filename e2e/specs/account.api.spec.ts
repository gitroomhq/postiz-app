import { testPrisma } from '@gitroom/testing/prisma/test.database';
import { BACKEND, expect, test } from '../fixtures';

/**
 * The account and team routes through the running backend, so the real auth
 * middleware resolves the session cookie into an organization and the real
 * policies guard decides what a member may do. The integration suite covers
 * the same controller with the middleware stubbed out; only here does an
 * actual cookie have to survive the whole chain.
 */
test.describe('account and team management', () => {
  const auth = (token: string) => ({ auth: token });

  test('describes the signed in account', async ({ org, request }) => {
    const response = await request.get(`${BACKEND}/user/self`, {
      headers: auth(org.token),
    });

    expect(response.status()).toBe(200);
    expect(await response.json()).toMatchObject({
      id: org.user.id,
      email: org.user.email,
      orgId: org.organization.id,
      role: 'SUPERADMIN',
    });
  });

  test('refuses an account route without a session', async ({ request }) => {
    const response = await request.get(`${BACKEND}/user/self`);

    expect(response.status()).toBe(401);
  });

  test('refuses a session whose token was not signed by us', async ({
    request,
  }) => {
    const response = await request.get(`${BACKEND}/user/self`, {
      headers: auth('not-a-real-token'),
    });

    expect(response.status()).toBe(401);
  });

  test('saves personal details and reads them back', async ({
    org,
    request,
  }) => {
    const saved = await request.post(`${BACKEND}/user/personal`, {
      headers: auth(org.token),
      data: { fullname: 'Dana Scully', bio: 'Investigating', company: 'FBI' },
    });
    expect(saved.status()).toBe(201);

    const readBack = await request.get(`${BACKEND}/user/personal`, {
      headers: auth(org.token),
    });
    expect(await readBack.json()).toMatchObject({ name: 'Dana Scully' });
  });

  test('rejects personal details the dto refuses', async ({ org, request }) => {
    const response = await request.post(`${BACKEND}/user/personal`, {
      headers: auth(org.token),
      data: { fullname: 'a', bio: 'x', company: 'y' },
    });

    expect(response.status()).toBe(400);
  });

  test('rotates the api key and invalidates the previous one', async ({
    org,
    request,
  }) => {
    const before = org.organization.apiKey!;

    const listedBefore = await request.get(`${BACKEND}/public/v1/integrations`, {
      headers: { Authorization: before },
    });
    expect(listedBefore.status()).toBe(200);

    const rotated = await request.post(`${BACKEND}/user/api-key/rotate`, {
      headers: auth(org.token),
    });
    expect(rotated.status()).toBe(201);
    const after = (await rotated.json()).apiKey;
    expect(after).not.toBe(before);

    // the point of a rotation: the old key stops working immediately
    const withOld = await request.get(`${BACKEND}/public/v1/integrations`, {
      headers: { Authorization: before },
    });
    expect(withOld.status()).toBe(401);

    const withNew = await request.get(`${BACKEND}/public/v1/integrations`, {
      headers: { Authorization: after },
    });
    expect(withNew.status()).toBe(200);
  });

  test('stores email notification preferences', async ({ org, request }) => {
    const saved = await request.post(`${BACKEND}/user/email-notifications`, {
      headers: auth(org.token),
      data: {
        sendSuccessEmails: false,
        sendFailureEmails: true,
        sendStreakEmails: false,
      },
    });
    expect(saved.status()).toBe(201);

    const readBack = await request.get(`${BACKEND}/user/email-notifications`, {
      headers: auth(org.token),
    });
    expect(await readBack.json()).toMatchObject({
      sendSuccessEmails: false,
      sendFailureEmails: true,
      sendStreakEmails: false,
    });
  });

  test('lists the team of the organization', async ({ org, request }) => {
    const response = await request.get(`${BACKEND}/settings/team`, {
      headers: auth(org.token),
    });

    expect(response.status()).toBe(200);
    const team = await response.json();
    expect(JSON.stringify(team)).toContain(org.user.id);
  });

  test('an owner can mint an invite link for the organization', async ({
    org,
    request,
  }) => {
    const response = await request.post(`${BACKEND}/settings/team`, {
      headers: auth(org.token),
      data: { email: 'colleague@postiz.test', role: 'USER', sendEmail: false },
    });

    expect(response.status()).toBe(201);
    expect((await response.json()).url).toContain('?org=');
  });

  // Characterisation of a real gap, not an endorsement. PermissionsService
  // short-circuits every requested policy when STRIPE_PUBLISHABLE_KEY is unset,
  // which is the self-hosted default, so the [Create, ADMIN] policy on this
  // route grants a plain USER as well. See permissions.service.spec.ts.
  test('a plain member can still invite on a self-hosted instance', async ({
    request,
  }) => {
    const member = await testPrisma().user.create({
      data: {
        email: `member-${Date.now()}@postiz.test`,
        providerName: 'LOCAL',
        name: 'Member',
        timezone: 0,
        activated: true,
      },
    });
    const organization = await testPrisma().organization.create({
      data: {
        name: 'Member Org',
        apiKey: null,
        users: { create: { userId: member.id, role: 'USER', disabled: false } },
      },
    });
    const { AuthService } = await import('@gitroom/helpers/auth/auth.service');
    const token = AuthService.signJWT({ id: member.id, email: member.email });

    const response = await request.post(`${BACKEND}/settings/team`, {
      headers: { auth: token, showorg: organization.id },
      data: { email: 'someone@postiz.test', role: 'USER', sendEmail: false },
    });

    expect(response.status()).toBe(201);
    expect((await response.json()).url).toContain('?org=');
  });
});
