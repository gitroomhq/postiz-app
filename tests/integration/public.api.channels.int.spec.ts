import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  INestApplication,
  MiddlewareConsumer,
  Module,
  NestModule,
} from '@nestjs/common';
import request from 'supertest';

import { DatabaseModule } from '@gitroom/nestjs-libraries/database/prisma/database.module';
import { PublicIntegrationsController } from '@gitroom/backend/public-api/routes/v1/public.integrations.controller';
import { PublicAuthMiddleware } from '@gitroom/backend/services/auth/public.auth.middleware';
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

@Module({
  imports: [DatabaseModule],
  controllers: [PublicIntegrationsController],
})
class PublicApiModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(PublicAuthMiddleware).forRoutes(PublicIntegrationsController);
  }
}

/**
 * The channel side of /public/v1, which the posts suite does not reach:
 * grouping by customer, the notification feed and channel deletion. Every
 * route is keyed by the API key alone, so cross-organization isolation is the
 * property that matters most.
 */
describe('Public API v1 channels (integration)', () => {
  let app: INestApplication;
  let org: Awaited<ReturnType<typeof createOrgWithUser>>;
  let apiKey: string;
  let integrationId: string;

  const api = () => request(app.getHttpServer());

  beforeAll(async () => {
    ({ app } = await createTestApp({ imports: [PublicApiModule], policies: false }));
  }, 60_000);

  afterAll(async () => {
    await app?.close();
    await disconnectTestPrisma();
  });

  beforeEach(async () => {
    await resetDatabase();
    org = await createOrgWithUser();
    apiKey = org.organization.apiKey!;
    integrationId = (await createIntegration(org.organization.id)).id;
  });

  describe('GET /public/v1/is-connected', () => {
    it('confirms a working api key', async () => {
      await api()
        .get('/public/v1/is-connected')
        .set('authorization', apiKey)
        .expect(200)
        .expect({ connected: true });
    });

    it('refuses a missing key', async () => {
      await api().get('/public/v1/is-connected').expect(401);
    });

    it('refuses a key that belongs to nobody', async () => {
      await api()
        .get('/public/v1/is-connected')
        .set('authorization', 'not-a-real-key')
        .expect(401);
    });
  });

  describe('GET /public/v1/integrations', () => {
    it('describes the connected channels', async () => {
      const response = await api()
        .get('/public/v1/integrations')
        .set('authorization', apiKey)
        .expect(200);

      expect(response.body).toEqual([
        expect.objectContaining({
          id: integrationId,
          name: 'Test Mastodon',
          identifier: 'mastodon',
          disabled: false,
        }),
      ]);
    });

    it('never lists a channel from another organization', async () => {
      const other = await createOrgWithUser();
      await createIntegration(other.organization.id, { name: 'Not Mine' });

      const response = await api()
        .get('/public/v1/integrations')
        .set('authorization', apiKey)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].id).toBe(integrationId);
    });

    it('answers with the caller organization even when keys are swapped', async () => {
      const other = await createOrgWithUser();
      const theirs = await createIntegration(other.organization.id);

      const response = await api()
        .get('/public/v1/integrations')
        .set('authorization', other.organization.apiKey!)
        .expect(200);

      expect(response.body.map((i: { id: string }) => i.id)).toEqual([theirs.id]);
    });
  });

  describe('customer grouping', () => {
    const assignCustomer = async (name: string) => {
      const customer = await testPrisma().customer.create({
        data: { name, orgId: org.organization.id },
      });
      await testPrisma().integration.update({
        where: { id: integrationId },
        data: { customerId: customer.id },
      });
      return customer;
    };

    it('lists the customers of the organization', async () => {
      const customer = await assignCustomer('Acme Client');

      const response = await api()
        .get('/public/v1/groups')
        .set('authorization', apiKey)
        .expect(200);

      expect(response.body).toEqual([{ id: customer.id, name: 'Acme Client' }]);
    });

    it('reports no groups before any customer exists', async () => {
      const response = await api()
        .get('/public/v1/groups')
        .set('authorization', apiKey)
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('returns the customer alongside the channel', async () => {
      const customer = await assignCustomer('Acme Client');

      const response = await api()
        .get('/public/v1/integrations')
        .set('authorization', apiKey)
        .expect(200);

      expect(response.body[0].customer).toEqual({
        id: customer.id,
        name: 'Acme Client',
      });
    });

    it('filters the channel list down to one group', async () => {
      const customer = await assignCustomer('Acme Client');
      await createIntegration(org.organization.id, { name: 'Ungrouped' });

      const response = await api()
        .get(`/public/v1/integrations?group=${customer.id}`)
        .set('authorization', apiKey)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].id).toBe(integrationId);
    });

    it('returns nothing for a group with no channels', async () => {
      await assignCustomer('Acme Client');

      const response = await api()
        .get('/public/v1/integrations?group=does-not-exist')
        .set('authorization', apiKey)
        .expect(200);

      expect(response.body).toEqual([]);
    });
  });

  describe('GET /public/v1/notifications', () => {
    it('returns an empty first page for a quiet organization', async () => {
      const response = await api()
        .get('/public/v1/notifications')
        .set('authorization', apiKey)
        .expect(200);

      expect(response.body).toHaveProperty('notifications');
    });

    it('accepts an explicit page', async () => {
      await api()
        .get('/public/v1/notifications?page=2')
        .set('authorization', apiKey)
        .expect(200);
    });
  });

  describe('DELETE /public/v1/integrations/:id', () => {
    it('removes the caller own channel', async () => {
      await api()
        .delete(`/public/v1/integrations/${integrationId}`)
        .set('authorization', apiKey)
        .expect(200);

      const saved = await testPrisma().integration.findUniqueOrThrow({
        where: { id: integrationId },
      });
      expect(saved.deletedAt).not.toBeNull();
    });

    it('leaves a channel of another organization alone', async () => {
      const other = await createOrgWithUser();
      const foreign = await createIntegration(other.organization.id);

      // scoped by organizationId, so Prisma matches no row; it surfaces as an
      // unclassified 500 rather than a 404, pinned rather than endorsed
      await api()
        .delete(`/public/v1/integrations/${foreign.id}`)
        .set('authorization', apiKey)
        .expect(500);

      const saved = await testPrisma().integration.findUniqueOrThrow({
        where: { id: foreign.id },
      });
      expect(saved.deletedAt).toBeNull();
    });
  });
});
