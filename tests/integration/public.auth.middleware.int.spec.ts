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
import { PublicAuthMiddleware } from '@gitroom/backend/services/auth/public.auth.middleware';
import { createTestApp } from '@gitroom/testing/nest/create.test.app';
import { createOrgWithUser } from '@gitroom/testing/factories/organization.factory';
import {
  disconnectTestPrisma,
  resetDatabase,
  testPrisma,
} from '@gitroom/testing/prisma/test.database';

@Controller('public-test')
class PublicTestController {
  @Get()
  get(@GetOrgFromRequest() org: { id: string; users: { role?: string }[] }) {
    return { orgId: org.id, firstUserRole: org.users?.[0]?.role ?? null };
  }
}

@Module({
  imports: [DatabaseModule],
  controllers: [PublicTestController],
})
class PublicTestModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(PublicAuthMiddleware).forRoutes(PublicTestController);
  }
}

describe('PublicAuthMiddleware (integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    ({ app } = await createTestApp({
      imports: [PublicTestModule],
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

  it('rejects a request with no authorization header', async () => {
    const response = await request(app.getHttpServer()).get('/public-test').expect(401);

    expect(response.body).toEqual({ msg: 'No API Key found' });
  });

  it('rejects an unknown api key', async () => {
    const response = await request(app.getHttpServer())
      .get('/public-test')
      .set('authorization', 'not-a-real-key')
      .expect(401);

    expect(response.body).toEqual({ msg: 'Invalid API key' });
  });

  it('rejects an unknown pos_ oauth token', async () => {
    const response = await request(app.getHttpServer())
      .get('/public-test')
      .set('authorization', 'pos_not-a-real-token')
      .expect(401);

    expect(response.body).toEqual({ msg: 'Invalid OAuth token' });
  });

  it('accepts a valid api key and attaches the organization', async () => {
    const { organization } = await createOrgWithUser();
    const stored = await testPrisma().organization.findUniqueOrThrow({
      where: { id: organization.id },
    });

    const response = await request(app.getHttpServer())
      .get('/public-test')
      .set('authorization', stored.apiKey as string)
      .expect(200);

    expect(response.body.orgId).toBe(organization.id);
  });

  it('attaches a users array whose first entry has no role property', async () => {
    // Characterisation. The middleware sets org.users to
    // [{ users: { role: 'SUPERADMIN' } }], while PoliciesGuard reads
    // org.users[0].role - which is therefore undefined. Harmless today because
    // no /public/v1 route requests Sections.ADMIN, but adding one would deny
    // every API key.
    const { organization } = await createOrgWithUser();
    const stored = await testPrisma().organization.findUniqueOrThrow({
      where: { id: organization.id },
    });

    const response = await request(app.getHttpServer())
      .get('/public-test')
      .set('authorization', stored.apiKey as string)
      .expect(200);

    expect(response.body.firstUserRole).toBeNull();
  });
});
