import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Controller, Get, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '@gitroom/testing/nest/create.test.app';
import { HttpForbiddenException } from '@gitroom/nestjs-libraries/services/exception.filter';
import {
  AuthorizationActions,
  Sections,
  SubscriptionException,
} from '@gitroom/backend/services/auth/permissions/permission.exception.class';
import { PostValidationException } from '@gitroom/backend/api/routes/posts.validation.exception';

/**
 * The three global exception filters are the contract between the backend and
 * the frontend's `afterRequest` hook: a 402 opens the billing dialog, a 401
 * bounces to login. They are registered in main.ts rather than in a module, so
 * nothing else in the test suite would catch a change to them.
 */
@Controller('boom')
class BoomController {
  @Get('forbidden')
  forbidden() {
    throw new HttpForbiddenException();
  }

  @Get('subscription')
  subscription() {
    throw new SubscriptionException({
      section: Sections.CHANNEL,
      action: AuthorizationActions.Create,
    });
  }

  @Get('post-validation')
  postValidation() {
    throw new PostValidationException({
      provider: 'mastodon',
      name: 'Test Mastodon',
      error: 'Content is too long',
    } as never);
  }
}

// supertest types `headers` as Record<string, string>, but set-cookie is an array.
const cookieHeader = (response: { headers: Record<string, unknown> }) =>
  [response.headers['set-cookie'] ?? []].flat().join(';');

describe('global exception filters (integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    ({ app } = await createTestApp({
      controllers: [BoomController],
      policies: false,
    }));
  }, 60_000);

  afterAll(async () => {
    await app?.close();
  });

  it('renders HttpForbiddenException as a 401 that clears the auth cookie', async () => {
    const response = await request(app.getHttpServer())
      .get('/boom/forbidden')
      .expect(401);

    expect(cookieHeader(response)).toContain('auth=');
    expect(response.headers.logout).toBe('true');
  });

  it('renders SubscriptionException as a 402 the billing dialog can act on', async () => {
    // The filter translates {section, action} into a human message plus the
    // billing URL; that translated shape - not the raw enum pair - is what the
    // frontend reads, so it is what this pins.
    const response = await request(app.getHttpServer())
      .get('/boom/subscription')
      .expect(402);

    expect(response.body).toEqual({
      statusCode: 402,
      message: expect.stringContaining('maximum number of channels'),
      url: `${process.env.FRONTEND_URL}/billing`,
    });
  });

  it('renders PostValidationException with the provider and reason', async () => {
    const response = await request(app.getHttpServer())
      .get('/boom/post-validation')
      .expect(400);

    expect(JSON.stringify(response.body)).toContain('Content is too long');
  });
});
