import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { DatabaseModule } from '@gitroom/nestjs-libraries/database/prisma/database.module';
import { WebhookController } from '@gitroom/backend/api/routes/webhooks.controller';
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
 * Webhooks against real rows, with the real ValidationPipe in front.
 *
 * The url field carries IsSafeWebhookUrl, so this is where that validator is
 * exercised the way production reaches it - through class-validator, inside a
 * request - rather than as a function. The unit spec next to the validator
 * covers the address matrix; this covers that it is actually wired up, that a
 * rejection is a 400 rather than a 500, and that ownership holds.
 */
describe('WebhookController (integration)', () => {
  let app: INestApplication;
  let org: Awaited<ReturnType<typeof createOrgWithUser>>;
  let other: Awaited<ReturnType<typeof createOrgWithUser>>;
  let integrationId: string;

  const api = () => request(app.getHttpServer());

  const webhook = (over: Record<string, unknown> = {}) => ({
    name: 'Deploy hook',
    url: 'https://8.8.8.8/hook',
    integrations: [],
    ...over,
  });

  beforeAll(async () => {
    ({ app } = await createTestApp({
      imports: [DatabaseModule],
      controllers: [WebhookController],
      policies: false,
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
    org = await createOrgWithUser();
    other = await createOrgWithUser();
    integrationId = (await createIntegration(org.organization.id)).id;
  });

  describe('POST /webhooks', () => {
    it('stores a webhook against the calling organization', async () => {
      const { body } = await api().post('/webhooks').send(webhook()).expect(201);

      expect(body.id).toBeTruthy();

      const stored = await testPrisma().webhooks.findFirst({
        where: { organizationId: org.organization.id },
      });
      expect(stored).toMatchObject({
        name: 'Deploy hook',
        url: 'https://8.8.8.8/hook',
        deletedAt: null,
      });
    });

    it('links the named integrations', async () => {
      await api()
        .post('/webhooks')
        .send(webhook({ integrations: [{ id: integrationId }] }))
        .expect(201);

      const { body } = await api().get('/webhooks').expect(200);

      expect(body[0].integrations).toHaveLength(1);
      expect(body[0].integrations[0].integration.id).toBe(integrationId);
    });

    it.each([
      ['a loopback address', 'https://127.0.0.1/hook'],
      ['the cloud metadata address', 'https://169.254.169.254/latest/meta-data/'],
      ['a private range address', 'https://10.0.0.5/hook'],
      ['a link-local v6 address', 'https://[::1]/hook'],
      ['plain http', 'http://8.8.8.8/hook'],
    ])('rejects %s with a 400', async (_label, url) => {
      await api().post('/webhooks').send(webhook({ url })).expect(400);

      expect(
        await testPrisma().webhooks.count({
          where: { organizationId: org.organization.id },
        })
      ).toBe(0);
    });

    it('explains why the url was refused', async () => {
      const { body } = await api()
        .post('/webhooks')
        .send(webhook({ url: 'https://127.0.0.1/hook' }))
        .expect(400);

      expect(JSON.stringify(body)).toContain('internal network addresses');
    });

    it.each([
      ['a missing url', { url: undefined }],
      ['a missing name', { name: undefined }],
      ['a non-url string', { url: 'not a url' }],
      ['missing integrations', { integrations: undefined }],
    ])('rejects %s with a 400', async (_label, over) => {
      await api().post('/webhooks').send(webhook(over)).expect(400);
    });

    it('updates in place when an existing id is sent back', async () => {
      const { body: created } = await api()
        .post('/webhooks')
        .send(webhook())
        .expect(201);

      await api()
        .post('/webhooks')
        .send(webhook({ id: created.id, name: 'Renamed', url: 'https://1.1.1.1/hook' }))
        .expect(201);

      const all = await testPrisma().webhooks.findMany({
        where: { organizationId: org.organization.id },
      });
      expect(all).toHaveLength(1);
      expect(all[0]).toMatchObject({ name: 'Renamed', url: 'https://1.1.1.1/hook' });
    });

    it('replaces the integration links rather than appending to them', async () => {
      const second = await createIntegration(org.organization.id);
      const { body: created } = await api()
        .post('/webhooks')
        .send(webhook({ integrations: [{ id: integrationId }] }))
        .expect(201);

      await api()
        .post('/webhooks')
        .send(webhook({ id: created.id, integrations: [{ id: second.id }] }))
        .expect(201);

      const { body } = await api().get('/webhooks').expect(200);
      expect(body[0].integrations.map((i: any) => i.integration.id)).toEqual([
        second.id,
      ]);
    });
  });

  describe('GET /webhooks', () => {
    it('returns an empty list for a fresh organization', async () => {
      await api().get('/webhooks').expect(200).expect([]);
    });

    it('never returns another organization\'s webhooks', async () => {
      await testPrisma().webhooks.create({
        data: {
          name: 'Theirs',
          url: 'https://1.1.1.1/theirs',
          organizationId: other.organization.id,
        },
      });
      await api().post('/webhooks').send(webhook({ name: 'Mine' })).expect(201);

      const { body } = await api().get('/webhooks').expect(200);

      expect(body).toHaveLength(1);
      expect(body[0].name).toBe('Mine');
    });

    it('hides a deleted webhook', async () => {
      const { body: created } = await api().post('/webhooks').send(webhook()).expect(201);

      await api().delete(`/webhooks/${created.id}`).expect(200);

      await api().get('/webhooks').expect(200).expect([]);
    });
  });

  describe('DELETE /webhooks/:id', () => {
    it('soft-deletes rather than dropping the row', async () => {
      const { body: created } = await api().post('/webhooks').send(webhook()).expect(201);

      await api().delete(`/webhooks/${created.id}`).expect(200);

      const stored = await testPrisma().webhooks.findUnique({
        where: { id: created.id },
      });
      expect(stored).toBeTruthy();
      expect(stored!.deletedAt).toBeTruthy();
    });

    it('refuses to delete a webhook belonging to another organization', async () => {
      const theirs = await testPrisma().webhooks.create({
        data: {
          name: 'Theirs',
          url: 'https://1.1.1.1/theirs',
          organizationId: other.organization.id,
        },
      });

      // Pinned rather than endorsed: Prisma's P2025 reaches the exception
      // filter unclassified, so this surfaces as a 500 where a 404 would be
      // right. Mirrors the note in integrations.controller.int.spec.ts.
      await api().delete(`/webhooks/${theirs.id}`).expect(500);

      const stored = await testPrisma().webhooks.findUnique({
        where: { id: theirs.id },
      });
      expect(stored!.deletedAt).toBeNull();
    });
  });

  describe('PUT /webhooks', () => {
    it('requires an id, unlike POST', async () => {
      await api().put('/webhooks').send(webhook()).expect(400);
    });

    it('applies the same url rules as POST', async () => {
      const { body: created } = await api().post('/webhooks').send(webhook()).expect(201);

      await api()
        .put('/webhooks')
        .send(webhook({ id: created.id, url: 'https://192.168.0.1/hook' }))
        .expect(400);
    });

    it('updates the row when the payload is valid', async () => {
      const { body: created } = await api().post('/webhooks').send(webhook()).expect(201);

      await api()
        .put('/webhooks')
        .send(webhook({ id: created.id, name: 'Updated', url: 'https://1.1.1.1/hook' }))
        .expect(200);

      const stored = await testPrisma().webhooks.findUnique({
        where: { id: created.id },
      });
      expect(stored).toMatchObject({ name: 'Updated', url: 'https://1.1.1.1/hook' });
    });
  });

  describe('POST /webhooks/send', () => {
    it('refuses to call an internal address', async () => {
      // This route fetches the query url directly, with no SSRF-safe
      // dispatcher behind it - the DTO validator is the only thing standing
      // between a user-supplied string and a server-side request.
      const fetchSpy = vi.spyOn(globalThis, 'fetch');

      await api()
        .post('/webhooks/send?url=http://169.254.169.254/latest/meta-data/')
        .send({ hello: 'world' })
        .expect(400);

      expect(fetchSpy).not.toHaveBeenCalled();
      fetchSpy.mockRestore();
    });

    it('posts the body as json to an allowed url', async () => {
      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(new Response('ok'));

      await api()
        .post('/webhooks/send?url=https://8.8.8.8/hook')
        .send({ hello: 'world' })
        .expect(201)
        .expect({ send: true });

      expect(fetchSpy).toHaveBeenCalledWith('https://8.8.8.8/hook', {
        method: 'POST',
        body: JSON.stringify({ hello: 'world' }),
        headers: { 'Content-Type': 'application/json' },
      });
      fetchSpy.mockRestore();
    });

    it('still answers 201 when the target is unreachable', async () => {
      // Deliberately swallowed: the caller is told the send was attempted, not
      // that the far end accepted it.
      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockRejectedValue(new Error('connection refused'));

      await api()
        .post('/webhooks/send?url=https://8.8.8.8/hook')
        .send({})
        .expect(201)
        .expect({ send: true });

      // Without this the test would also pass if validation had rejected the
      // url before any request was attempted.
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      fetchSpy.mockRestore();
    });

    it('rejects a missing url', async () => {
      await api().post('/webhooks/send').send({}).expect(400);
    });
  });
});
