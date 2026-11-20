import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  Controller,
  Get,
  INestApplication,
  MiddlewareConsumer,
  Module,
  NestModule,
} from '@nestjs/common';
import request from 'supertest';
import { DatabaseModule } from '@gitroom/nestjs-libraries/database/prisma/database.module';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { GetUserFromRequest } from '@gitroom/nestjs-libraries/user/user.from.request';
import { AuthMiddleware } from '@gitroom/backend/services/auth/auth.middleware';
import { createTestApp } from '@gitroom/testing/nest/create.test.app';
import { createOrgWithUser } from '@gitroom/testing/factories/organization.factory';
import {
  disconnectTestPrisma,
  resetDatabase,
  testPrisma,
} from '@gitroom/testing/prisma/test.database';

/**
 * The auth middleware against a real database, so re-resolution and
 * impersonation are exercised through actual rows rather than mocks.
 *
 * The middleware is applied through configure(consumer) exactly as
 * api.module.ts does it in production. Applying it with a bare app.use()
 * instead would look equivalent but is not: an async middleware that throws
 * outside Nest's wrapper never reaches the exception filters, so every
 * rejection surfaces as a 500 rather than the 401 the frontend depends on.
 */
@Controller('whoami')
class WhoAmIController {
  @Get()
  get(
    @GetUserFromRequest() user: { id: string },
    @GetOrgFromRequest() org: { id: string }
  ) {
    return { userId: user.id, orgId: org.id };
  }
}

@Module({
  imports: [DatabaseModule],
  controllers: [WhoAmIController],
})
class TestAuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes(WhoAmIController);
  }
}

// supertest types `headers` as Record<string, string>, but set-cookie is an array.
const cookieHeader = (response: { headers: Record<string, unknown> }) =>
  [response.headers['set-cookie'] ?? []].flat().join(';');

describe('AuthMiddleware (integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    ({ app } = await createTestApp({
      imports: [TestAuthModule],
      policies: false,
    }));
  }, 60_000);

  afterAll(async () => {
    await app?.close();
    await disconnectTestPrisma();
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  it('rejects a request with no credentials', async () => {
    await request(app.getHttpServer()).get('/whoami').expect(401);
  });

  it('clears the auth cookie when rejecting', async () => {
    // The frontend's afterRequest hook keys on this to bounce to login.
    const response = await request(app.getHttpServer()).get('/whoami').expect(401);

    expect(cookieHeader(response)).toContain('auth=');
  });

  it('authenticates a real user and resolves their organization', async () => {
    const { user, organization, token } = await createOrgWithUser();

    const response = await request(app.getHttpServer())
      .get('/whoami')
      .set('auth', token)
      .expect(200);

    expect(response.body).toEqual({ userId: user.id, orgId: organization.id });
  });

  it('accepts the token from a cookie as well as a header', async () => {
    const { user, token } = await createOrgWithUser();

    const response = await request(app.getHttpServer())
      .get('/whoami')
      .set('Cookie', [`auth=${token}`])
      .expect(200);

    expect(response.body.userId).toBe(user.id);
  });

  it('rejects a signed token for a user that is not activated', async () => {
    const { token } = await createOrgWithUser({ user: { activated: false } });

    await request(app.getHttpServer()).get('/whoami').set('auth', token).expect(401);
  });

  it('creates the organization api key lazily on first use', async () => {
    const { organization, token } = await createOrgWithUser();
    await testPrisma().organization.update({
      where: { id: organization.id },
      data: { apiKey: null },
    });

    await request(app.getHttpServer()).get('/whoami').set('auth', token).expect(200);

    const after = await testPrisma().organization.findUnique({
      where: { id: organization.id },
    });
    expect(after?.apiKey).toBeTruthy();
  });

  it('does not let a non-superadmin impersonate another user', async () => {
    // The escalation guard, this time end to end over HTTP.
    const attacker = await createOrgWithUser();
    const victim = await createOrgWithUser();

    const response = await request(app.getHttpServer())
      .get('/whoami')
      .set('auth', attacker.token)
      .set('impersonate', victim.membershipId)
      .expect(200);

    expect(response.body.userId).toBe(attacker.user.id);
  });

  it('lets a superadmin impersonate another user', async () => {
    const admin = await createOrgWithUser({ user: { isSuperAdmin: true } });
    const victim = await createOrgWithUser();

    const response = await request(app.getHttpServer())
      .get('/whoami')
      .set('auth', admin.token)
      // Note this is the UserOrganization id, not the user id: the middleware
      // resolves it via getUserOrg, which queries userOrganization by id.
      .set('impersonate', victim.membershipId)
      .expect(200);

    expect(response.body.userId).toBe(victim.user.id);
  });
});
