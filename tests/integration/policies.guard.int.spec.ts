import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Controller, Get, INestApplication, Query } from '@nestjs/common';
import request from 'supertest';
import { DatabaseModule } from '@gitroom/nestjs-libraries/database/prisma/database.module';
import { CheckPolicies } from '@gitroom/backend/services/auth/permissions/permissions.ability';
import {
  AuthorizationActions,
  Sections,
} from '@gitroom/backend/services/auth/permissions/permission.exception.class';
import { createTestApp } from '@gitroom/testing/nest/create.test.app';
import {
  createIntegration,
  createOrgWithUser,
} from '@gitroom/testing/factories/organization.factory';
import {
  disconnectTestPrisma,
  resetDatabase,
  testPrisma,
} from '@gitroom/testing/prisma/test.database';

/**
 * PoliciesGuard, PermissionsService and SubscriptionExceptionFilter working
 * together against real rows: the path a user hits when they run out of
 * channels on their plan.
 */
@Controller('channels')
class ChannelsController {
  @Get()
  @CheckPolicies([AuthorizationActions.Create, Sections.CHANNEL])
  create(@Query('refresh') refresh?: string) {
    return { created: true, refresh };
  }
}

describe('PoliciesGuard (integration)', () => {
  let app: INestApplication;
  let org: Awaited<ReturnType<typeof createOrgWithUser>>;

  const asOrg = () => (req: any, _res: any, next: any) => {
    req.org = { ...org.organization, users: [{ role: 'SUPERADMIN' }] };
    req.user = org.user;
    next();
  };

  beforeAll(async () => {
    ({ app } = await createTestApp({
      imports: [DatabaseModule],
      controllers: [ChannelsController],
      middleware: [(req, res, next) => asOrg()(req, res, next)],
    }));
  }, 60_000);

  afterAll(async () => {
    await app?.close();
    await disconnectTestPrisma();
  });

  beforeEach(async () => {
    await resetDatabase();
    org = await createOrgWithUser();
    // Billing checks only run when Stripe is configured.
    process.env.STRIPE_PUBLISHABLE_KEY = 'pk_test_integration';
  });

  afterEach(() => {
    delete process.env.STRIPE_PUBLISHABLE_KEY;
  });

  it('allows everything when Stripe is not configured', async () => {
    delete process.env.STRIPE_PUBLISHABLE_KEY;

    await request(app.getHttpServer()).get('/channels').expect(200);
  });

  it('refuses a free organization its first channel, with the billing payload', async () => {
    const response = await request(app.getHttpServer()).get('/channels').expect(402);

    expect(response.body).toEqual({
      statusCode: 402,
      message: expect.stringContaining('maximum number of channels'),
      url: expect.stringContaining('/billing'),
    });
  });

  it('allows a subscribed organization below its channel allowance', async () => {
    await testPrisma().subscription.create({
      data: {
        organizationId: org.organization.id,
        subscriptionTier: 'STANDARD',
        totalChannels: 5,
        period: 'MONTHLY',
        identifier: 'sub-1',
      },
    });
    await createIntegration(org.organization.id);

    await request(app.getHttpServer()).get('/channels').expect(200);
  });
});
