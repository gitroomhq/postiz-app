import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { randomUUID } from 'node:crypto';

import { DatabaseModule } from '@gitroom/nestjs-libraries/database/prisma/database.module';
import { AuthController } from '@gitroom/backend/api/routes/auth.controller';
import { AuthService } from '@gitroom/backend/services/auth/auth.service';
import { AuthProviderManager } from '@gitroom/backend/services/auth/providers/providers.manager';
import { EmailService } from '@gitroom/nestjs-libraries/services/email.service';
import { AuthService as AuthHelper } from '@gitroom/helpers/auth/auth.service';
import { createTestApp } from '@gitroom/testing/nest/create.test.app';
import { TEST_PASSWORD, createOrgWithUser } from '@gitroom/testing/factories/organization.factory';
import {
  disconnectTestPrisma,
  resetDatabase,
  testPrisma,
} from '@gitroom/testing/prisma/test.database';

/**
 * Registration and login against real rows. Everything here decides who gets a
 * session, so it is worth exercising against the database rather than a mocked
 * user service: the password hash, the organization created alongside the user,
 * and the cookie the frontend reads.
 */
describe('AuthController (integration)', () => {
  let app: INestApplication;

  const email = () => `auth-${randomUUID()}@postiz.test`;

  const register = (over: Record<string, unknown> = {}) =>
    request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: email(),
        password: TEST_PASSWORD,
        company: 'Test Co',
        provider: 'LOCAL',
        ...over,
      });

  beforeAll(async () => {
    ({ app } = await createTestApp({
      imports: [DatabaseModule],
      controllers: [AuthController],
      policies: false,
      providers: [
        AuthService,
        AuthProviderManager,
        // The real mailer needs a configured provider; without one the
        // controller skips the activation branch, which is what a
        // self-hosted install without SMTP does.
        { provide: EmailService, useValue: { hasProvider: () => false, sendEmail: async () => {} } },
      ],
    }));
  }, 60_000);

  afterAll(async () => {
    await app?.close();
    await disconnectTestPrisma();
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  it('reports that local registration is open', async () => {
    const response = await request(app.getHttpServer())
      .get('/auth/can-register')
      .expect(200);

    expect(response.body).toEqual({ register: true });
  });

  it('creates the user, an organization and a session cookie', async () => {
    const address = email();

    const response = await register({ email: address }).expect(200);

    expect(response.body).toEqual({ register: true });
    expect(response.headers['auth']).toBeTruthy();

    const user = await testPrisma().user.findFirstOrThrow({ where: { email: address } });
    const membership = await testPrisma().userOrganization.findFirstOrThrow({
      where: { userId: user.id },
    });
    // The first member of a new organization has to be able to administer it.
    expect(membership.role).toBe('SUPERADMIN');
  });

  it('never stores the password as given', async () => {
    const address = email();

    await register({ email: address }).expect(200);

    const user = await testPrisma().user.findFirstOrThrow({ where: { email: address } });
    expect(user.password).not.toBe(TEST_PASSWORD);
    expect(AuthHelper.comparePassword(TEST_PASSWORD, user.password!)).toBe(true);
  });

  it('issues a session that resolves back to the new user', async () => {
    const address = email();

    const response = await register({ email: address }).expect(200);

    const decoded = AuthHelper.verifyJWT(response.headers['auth']) as { email: string };
    expect(decoded.email).toBe(address);
  });

  it('refuses a second registration with the same email', async () => {
    const address = email();
    await register({ email: address }).expect(200);

    // Two accounts on one address would make login ambiguous.
    await register({ email: address }).expect(400);
    expect(await testPrisma().user.count({ where: { email: address } })).toBe(1);
  });

  it('rejects a body the DTO refuses', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'not-an-email', password: 'x' })
      .expect(400);

    expect(await testPrisma().user.count()).toBe(0);
  });

  it('logs a seeded user in and returns a session', async () => {
    const org = await createOrgWithUser();

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: org.user.email, password: TEST_PASSWORD, provider: 'LOCAL' })
      .expect(200);

    // showorg is only set when the login also joined an organization through
    // the invite cookie; a plain login leaves the frontend to pick.
    expect(response.headers['auth']).toBeTruthy();
    expect(
      (AuthHelper.verifyJWT(response.headers['auth']) as { id: string }).id
    ).toBe(org.user.id);
  });

  it('refuses the wrong password', async () => {
    const org = await createOrgWithUser();

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: org.user.email, password: 'not-the-password', provider: 'LOCAL' })
      .expect(400);
  });

  it('refuses an email that was never registered', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'nobody@postiz.test', password: TEST_PASSWORD, provider: 'LOCAL' })
      .expect(400);
  });

  it('does not say whether the address exists when asked to reset', async () => {
    const org = await createOrgWithUser();

    const known = await request(app.getHttpServer())
      .post('/auth/forgot')
      .send({ email: org.user.email });
    const unknown = await request(app.getHttpServer())
      .post('/auth/forgot')
      .send({ email: 'nobody@postiz.test' });

    // Differing answers here turn the reset form into an account-enumeration
    // oracle.
    expect(unknown.status).toBe(known.status);
  });
});
