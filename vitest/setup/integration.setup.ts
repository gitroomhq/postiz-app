import 'reflect-metadata';
import { beforeAll, vi } from 'vitest';
import { assertTestDatabase } from '@gitroom/testing/prisma/test.database';

vi.mock('ioredis', async () => {
  const { FakeRedis } = await import('@gitroom/testing/redis/fake.redis');
  return { default: FakeRedis, Redis: FakeRedis };
});

process.env.TZ = 'UTC';
process.env.NODE_ENV = 'test';
process.env.DISABLE_SSRF_PROTECTION = 'true';
process.env.JWT_SECRET ??= 'postiz-test-secret';

// Read by removeAuth's cookie domain and SubscriptionExceptionFilter's URL.
process.env.FRONTEND_URL ??= 'http://localhost:4200';
process.env.NOT_SECURED ??= 'true';

delete process.env.STRIPE_PUBLISHABLE_KEY;
delete process.env.STRIPE_SECRET_KEY;

beforeAll(() => {
  assertTestDatabase();
});
