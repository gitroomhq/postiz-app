import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { DatabaseModule } from '@gitroom/nestjs-libraries/database/prisma/database.module';
import { IntegrationsController } from '@gitroom/backend/api/routes/integrations.controller';
import { IntegrationManager } from '@gitroom/nestjs-libraries/integrations/integration.manager';
import { RefreshIntegrationService } from '@gitroom/nestjs-libraries/integrations/refresh.integration.service';
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
 * Channel management against real rows: what /list actually joins from the
 * provider registry, and that disable, enable and delete change the database
 * rather than only answering 200. Ownership matters most here - a channel id
 * from another organization must never be touched.
 */
describe('IntegrationsController (integration)', () => {
  let app: INestApplication;
  let org: Awaited<ReturnType<typeof createOrgWithUser>>;
  let integrationId: string;
  // Refresh reaches the provider over the network; the function endpoint
  // tests script it per case, everything else leaves it inert.
  const refreshService = { refresh: vi.fn() };

  beforeAll(async () => {
    ({ app } = await createTestApp({
      imports: [DatabaseModule],
      controllers: [IntegrationsController],
      policies: false,
      providers: [
        IntegrationManager,
        { provide: RefreshIntegrationService, useValue: refreshService },
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

  beforeEach(async () => {
    await resetDatabase();
    refreshService.refresh.mockReset().mockResolvedValue({});
    org = await createOrgWithUser();
    integrationId = (await createIntegration(org.organization.id)).id;
  });

  describe('GET /integrations/list', () => {
    it('describes the connected channel from the row and the provider registry', async () => {
      const response = await request(app.getHttpServer())
        .get('/integrations/list')
        .expect(200);

      expect(response.body.integrations).toHaveLength(1);
      expect(response.body.integrations[0]).toMatchObject({
        id: integrationId,
        name: 'Test Mastodon',
        identifier: 'mastodon',
        disabled: false,
        refreshNeeded: false,
        editor: expect.any(String),
      });
    });

    it('falls back to a placeholder picture', async () => {
      const response = await request(app.getHttpServer())
        .get('/integrations/list')
        .expect(200);

      expect(response.body.integrations[0].picture).toBe('/no-picture.jpg');
    });

    it('parses the stored posting times rather than echoing the json', async () => {
      const response = await request(app.getHttpServer())
        .get('/integrations/list')
        .expect(200);

      expect(Array.isArray(response.body.integrations[0].time)).toBe(true);
    });

    it('never lists a channel belonging to another organization', async () => {
      const other = await createOrgWithUser();
      await createIntegration(other.organization.id, { name: 'Not Mine' });

      const response = await request(app.getHttpServer())
        .get('/integrations/list')
        .expect(200);

      expect(response.body.integrations).toHaveLength(1);
      expect(response.body.integrations[0].id).toBe(integrationId);
    });

    // A token refresh used to clear inBetweenSteps on a channel that never
    // finished the picker; internalId still holding the account id tells.
    it('reports a channel that never finished page selection as in between steps', async () => {
      const flipped = await createIntegration(org.organization.id, {
        providerIdentifier: 'youtube',
        internalId: 'acc-1',
        rootInternalId: 'acc-1',
        inBetweenSteps: false,
      });

      const response = await request(app.getHttpServer())
        .get('/integrations/list')
        .expect(200);

      const byId = Object.fromEntries(
        response.body.integrations.map((i: { id: string }) => [i.id, i])
      );
      expect(byId[flipped.id].inBetweenSteps).toBe(true);
      expect(byId[integrationId].inBetweenSteps).toBe(false);
    });

    it('does not flag a provider whose page id may equal the account id', async () => {
      const blog = await createIntegration(org.organization.id, {
        providerIdentifier: 'tumblr',
        internalId: 'acc-1',
        rootInternalId: 'acc-1',
        inBetweenSteps: false,
      });

      const response = await request(app.getHttpServer())
        .get('/integrations/list')
        .expect(200);

      const row = response.body.integrations.find((i: { id: string }) => i.id === blog.id);
      expect(row.inBetweenSteps).toBe(false);
    });

    it('reports an organization with no channels as empty', async () => {
      await testPrisma().integration.deleteMany({
        where: { organizationId: org.organization.id },
      });

      const response = await request(app.getHttpServer())
        .get('/integrations/list')
        .expect(200);

      expect(response.body.integrations).toEqual([]);
    });
  });

  describe('POST /integrations/function', () => {
    // maxLength needs no network, so the provider call itself is observable
    // without stubbing HTTP. The endpoint answers with a bare scalar, which
    // supertest leaves in `text` rather than `body`.
    const provider = () =>
      app.get(IntegrationManager).getSocialIntegration('mastodon');
    const call = (id: string) =>
      request(app.getHttpServer())
        .post('/integrations/function')
        .send({ id, name: 'maxLength', data: {} });

    it('refreshes an expired token before calling the provider', async () => {
      const expired = await createIntegration(org.organization.id, {
        tokenExpiration: new Date(Date.now() - 60_000),
      });
      refreshService.refresh.mockResolvedValue({
        accessToken: 'fresh',
        refreshToken: 'fresh-r',
      });
      const maxLength = vi.spyOn(provider(), 'maxLength');

      const response = await call(expired.id).expect(201);

      expect(response.text).toBe('500');
      expect(refreshService.refresh).toHaveBeenCalledTimes(1);
      expect(refreshService.refresh).toHaveBeenCalledWith(
        expect.objectContaining({ id: expired.id })
      );
      expect(maxLength).toHaveBeenCalledWith(
        'fresh',
        {},
        expired.internalId,
        expect.objectContaining({ id: expired.id, refreshToken: 'fresh-r' })
      );
    });

    it('returns false when the expired token cannot be refreshed', async () => {
      const expired = await createIntegration(org.organization.id, {
        tokenExpiration: new Date(Date.now() - 60_000),
      });
      refreshService.refresh.mockResolvedValue(false);
      const maxLength = vi.spyOn(provider(), 'maxLength');

      const response = await call(expired.id).expect(201);

      expect(response.text).toBe('false');
      expect(maxLength).not.toHaveBeenCalled();
    });

    it('leaves a valid token alone', async () => {
      const maxLength = vi.spyOn(provider(), 'maxLength');

      const response = await call(integrationId).expect(201);

      expect(response.text).toBe('500');
      expect(refreshService.refresh).not.toHaveBeenCalled();
      expect(maxLength).toHaveBeenCalledWith(
        'e2e-mastodon-token',
        {},
        expect.any(String),
        expect.objectContaining({ id: integrationId })
      );
    });
  });

  describe('disable and enable', () => {
    it('disables a channel in the database', async () => {
      await request(app.getHttpServer())
        .post('/integrations/disable')
        .send({ id: integrationId })
        .expect(201);

      const saved = await testPrisma().integration.findUniqueOrThrow({
        where: { id: integrationId },
      });
      expect(saved.disabled).toBe(true);
    });

    it('enables it again', async () => {
      await testPrisma().integration.update({
        where: { id: integrationId },
        data: { disabled: true },
      });

      await request(app.getHttpServer())
        .post('/integrations/enable')
        .send({ id: integrationId })
        .expect(201);

      const saved = await testPrisma().integration.findUniqueOrThrow({
        where: { id: integrationId },
      });
      expect(saved.disabled).toBe(false);
    });

    // Isolation holds - the update is scoped by organizationId, so Prisma
    // matches no row. It surfaces as an unclassified 500 rather than a 404,
    // which is pinned here rather than endorsed.
    it('leaves another organization channel untouched', async () => {
      const other = await createOrgWithUser();
      const foreign = await createIntegration(other.organization.id);

      await request(app.getHttpServer())
        .post('/integrations/disable')
        .send({ id: foreign.id })
        .expect(500);

      const saved = await testPrisma().integration.findUniqueOrThrow({
        where: { id: foreign.id },
      });
      expect(saved.disabled).toBe(false);
    });
  });

  describe('DELETE /integrations', () => {
    it('removes the channel', async () => {
      await request(app.getHttpServer())
        .delete('/integrations/')
        .send({ id: integrationId })
        .expect(200);

      const saved = await testPrisma().integration.findUnique({
        where: { id: integrationId },
      });
      expect(saved?.deletedAt ?? null).not.toBeNull();
    });

    it('refuses to delete a channel of another organization', async () => {
      const other = await createOrgWithUser();
      const foreign = await createIntegration(other.organization.id);

      await request(app.getHttpServer())
        .delete('/integrations/')
        .send({ id: foreign.id })
        .expect(500);

      const saved = await testPrisma().integration.findUniqueOrThrow({
        where: { id: foreign.id },
      });
      expect(saved.deletedAt).toBeNull();
    });
  });

  describe('customer and nickname', () => {
    it('assigns a customer and reads it back on the list', async () => {
      await request(app.getHttpServer())
        .put(`/integrations/${integrationId}/customer-name`)
        .send({ name: 'Acme Client' })
        .expect(200);

      const response = await request(app.getHttpServer())
        .get('/integrations/list')
        .expect(200);

      expect(response.body.integrations[0].customer).toMatchObject({
        name: 'Acme Client',
      });
    });

    it('lists the customers of the organization', async () => {
      await request(app.getHttpServer())
        .put(`/integrations/${integrationId}/customer-name`)
        .send({ name: 'Acme Client' })
        .expect(200);

      const response = await request(app.getHttpServer())
        .get('/integrations/customers')
        .expect(200);

      expect(JSON.stringify(response.body)).toContain('Acme Client');
    });
  });

  describe('GET /integrations/plug/list', () => {
    it('lists the plugs the registry exposes', async () => {
      const response = await request(app.getHttpServer())
        .get('/integrations/plug/list')
        .expect(200);

      expect(response.body).toHaveProperty('plugs');
    });
  });
});
