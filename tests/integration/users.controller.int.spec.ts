import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { DatabaseModule } from '@gitroom/nestjs-libraries/database/prisma/database.module';
import { UsersController } from '@gitroom/backend/api/routes/users.controller';
import { AuthService } from '@gitroom/backend/services/auth/auth.service';
import { PaymentService } from '@gitroom/nestjs-libraries/services/payment/payment.service';
import { TrackService } from '@gitroom/nestjs-libraries/track/track.service';
import { AuthService as AuthChecker } from '@gitroom/helpers/auth/auth.service';
import { createTestApp } from '@gitroom/testing/nest/create.test.app';
import { createOrgWithUser } from '@gitroom/testing/factories/organization.factory';
import {
  disconnectTestPrisma,
  resetDatabase,
  testPrisma,
} from '@gitroom/testing/prisma/test.database';

/**
 * The account routes against real rows: what /self actually derives from an
 * organization, and that the personal and notification writes land in the
 * database rather than only being echoed back.
 */
describe('UsersController (integration)', () => {
  let app: INestApplication;
  let org: Awaited<ReturnType<typeof createOrgWithUser>>;

  beforeAll(async () => {
    ({ app } = await createTestApp({
      imports: [DatabaseModule],
      controllers: [UsersController],
      policies: false,
      // These three reach Stripe, the backend auth graph and an analytics
      // endpoint; none of the routes under test depend on their behaviour.
      providers: [
        {
          provide: PaymentService,
          useValue: {
            getDefaultProvider: () => ({
              getPackages: async () => ({ STANDARD: {}, PRO: {} }),
            }),
          },
        },
        { provide: AuthService, useValue: {} },
        { provide: TrackService, useValue: { track: async () => undefined } },
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

  // AuthMiddleware hands the routes an organization with its users and
  // subscription joined; the factory returns the bare row.
  const withRelations = async (organizationId: string) =>
    testPrisma().organization.findUniqueOrThrow({
      where: { id: organizationId },
      include: { users: true, subscription: true },
    });

  const useOrg = async (
    created: Awaited<ReturnType<typeof createOrgWithUser>>
  ) => {
    org = {
      ...created,
      organization: (await withRelations(created.organization.id)) as never,
    };
  };

  beforeEach(async () => {
    await resetDatabase();
    await useOrg(await createOrgWithUser());
    delete process.env.STRIPE_PUBLISHABLE_KEY;
  });

  describe('GET /user/self', () => {
    it('describes the signed in user against their organization', async () => {
      const response = await request(app.getHttpServer())
        .get('/user/self')
        .expect(200);

      expect(response.body).toMatchObject({
        id: org.user.id,
        email: org.user.email,
        orgId: org.organization.id,
        role: 'SUPERADMIN',
        admin: false,
        impersonate: false,
        isLifetime: false,
      });
    });

    it('treats a self-hosted instance as the unlimited tier', async () => {
      const response = await request(app.getHttpServer())
        .get('/user/self')
        .expect(200);

      expect(response.body).toMatchObject({
        tier: 'ULTIMATE',
        totalChannels: 10000,
        isTrailing: false,
      });
    });

    it('falls back to the free tier once billing is configured', async () => {
      process.env.STRIPE_PUBLISHABLE_KEY = 'pk_test_1';

      const response = await request(app.getHttpServer())
        .get('/user/self')
        .expect(200);

      expect(response.body).toMatchObject({ tier: 'FREE' });
    });

    it('hands the api key to an owner', async () => {
      const response = await request(app.getHttpServer())
        .get('/user/self')
        .expect(200);

      expect(response.body.publicApi).toBe(org.organization.apiKey);
    });

    it('withholds the api key from a plain member', async () => {
      await useOrg(await createOrgWithUser({ role: 'USER' }));

      const response = await request(app.getHttpServer())
        .get('/user/self')
        .expect(200);

      expect(response.body.publicApi).toBe('');
      expect(response.body.role).toBe('USER');
    });

    it('reports an impersonated session', async () => {
      const response = await request(app.getHttpServer())
        .get('/user/self')
        .set('impersonate', org.membershipId)
        .expect(200);

      expect(response.body.impersonate).toBe(true);
    });

    it('refuses when the request carries no organization', async () => {
      // deliberately dropping the org the middleware injects
      org = { ...org, organization: undefined as never };

      await request(app.getHttpServer()).get('/user/self').expect(401);
    });
  });

  describe('personal details', () => {
    it('starts from the row the factory created', async () => {
      const response = await request(app.getHttpServer())
        .get('/user/personal')
        .expect(200);

      expect(response.body).toMatchObject({ name: 'Test User' });
    });

    it('persists a change rather than only echoing it', async () => {
      await request(app.getHttpServer())
        .post('/user/personal')
        .send({ fullname: 'Dana Scully', bio: 'Investigating', company: 'FBI' })
        .expect(201);

      const saved = await testPrisma().user.findUniqueOrThrow({
        where: { id: org.user.id },
      });
      expect(saved).toMatchObject({ name: 'Dana Scully', bio: 'Investigating' });
    });

    it('rejects a name shorter than the dto allows', async () => {
      await request(app.getHttpServer())
        .post('/user/personal')
        .send({ fullname: 'a', bio: 'x', company: 'y' })
        .expect(400);

      const saved = await testPrisma().user.findUniqueOrThrow({
        where: { id: org.user.id },
      });
      expect(saved.name).toBe('Test User');
    });
  });

  describe('email notifications', () => {
    it('reports each of the three preferences', async () => {
      const response = await request(app.getHttpServer())
        .get('/user/email-notifications')
        .expect(200);

      expect(response.body).toEqual({
        sendSuccessEmails: expect.any(Boolean),
        sendFailureEmails: expect.any(Boolean),
        sendStreakEmails: expect.any(Boolean),
      });
    });

    it('writes a preference change to the database', async () => {
      await request(app.getHttpServer())
        .post('/user/email-notifications')
        .send({
          sendSuccessEmails: false,
          sendFailureEmails: true,
          sendStreakEmails: false,
        })
        .expect(201);

      const saved = await testPrisma().user.findUniqueOrThrow({
        where: { id: org.user.id },
      });
      expect(saved).toMatchObject({
        sendSuccessEmails: false,
        sendFailureEmails: true,
        sendStreakEmails: false,
      });
    });
  });

  describe('POST /user/api-key/rotate', () => {
    it('issues a new key and hands back the value the public api expects', async () => {
      const before = org.organization.apiKey;

      const response = await request(app.getHttpServer())
        .post('/user/api-key/rotate')
        .expect(201);

      const saved = await testPrisma().organization.findUniqueOrThrow({
        where: { id: org.organization.id },
      });
      expect(saved.apiKey).not.toBe(before);
      // getOrgByApiKey matches the stored column verbatim, so the encrypted
      // value is the key itself - the route returns it rather than a plaintext
      expect(response.body.apiKey).toBe(saved.apiKey);
      expect(AuthChecker.fixedDecryption(saved.apiKey!)).toHaveLength(20);
    });
  });

  describe('GET /user/subscription/tiers', () => {
    it('lists the sellable plans', async () => {
      const response = await request(app.getHttpServer())
        .get('/user/subscription/tiers')
        .expect(200);

      expect(Object.keys(response.body)).toEqual(
        expect.arrayContaining(['STANDARD', 'PRO'])
      );
    });
  });

  describe('GET /user/impersonate', () => {
    it('refuses a non super admin', async () => {
      await request(app.getHttpServer())
        .get('/user/impersonate?name=someone')
        .expect(400);
    });

    it('searches accounts for a super admin', async () => {
      await useOrg(await createOrgWithUser({ user: { isSuperAdmin: true } }));

      const response = await request(app.getHttpServer())
        .get(`/user/impersonate?name=${encodeURIComponent(org.user.email)}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });
});
