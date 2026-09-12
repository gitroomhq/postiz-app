import 'reflect-metadata';
import { vi } from 'vitest';

// Hoisted factory, so the shared class is imported inside it. A spec that
// genuinely needs Redis can vi.unmock('ioredis').
vi.mock('ioredis', async () => {
  const { FakeRedis } = await import('@gitroom/testing/redis/fake.redis');
  return { default: FakeRedis, Redis: FakeRedis };
});

// redis.service.ts builds its exported client at import time when this is set,
// and app.module.ts references it at module definition time.
delete process.env.REDIS_URL;

delete process.env.SENTRY_DSN;
delete process.env.NEXT_PUBLIC_SENTRY_DSN;

// PermissionsService grants everything without the publishable key, and
// PostActivity skips its subscription check without the secret key. Specs that
// care set them explicitly.
delete process.env.STRIPE_PUBLISHABLE_KEY;
delete process.env.STRIPE_SECRET_KEY;

process.env.TZ = 'UTC';
process.env.NODE_ENV = 'test';
process.env.DISABLE_SSRF_PROTECTION = 'true';

// Must be stable across runs for the fixedEncryption known-answer test.
process.env.JWT_SECRET ??= 'postiz-test-secret';

// A unit test that reaches a real database should fail loudly rather than
// mutate whatever happens to be in the developer's shell.
process.env.DATABASE_URL =
  'postgresql://unit-tests-must-not-connect@127.0.0.1:1/invalid';
