import { resetDatabase, disconnectTestPrisma } from '@gitroom/testing/prisma/test.database';

/**
 * Fail fast on an environment that would produce confusing test failures
 * rather than obvious ones.
 */
export default async function globalSetup() {
  if (process.env.STRIPE_PUBLISHABLE_KEY || process.env.STRIPE_SECRET_KEY) {
    throw new Error(
      'STRIPE_PUBLISHABLE_KEY and STRIPE_SECRET_KEY must both be unset for E2E. ' +
        'The first makes PermissionsService enforce billing limits against the ' +
        'seeded org, the second makes PostActivity require a subscription before ' +
        'publishing - both would fail the fixtures for non-obvious reasons.'
    );
  }

  if (process.env.DISABLE_SSRF_PROTECTION !== 'true') {
    throw new Error(
      'DISABLE_SSRF_PROTECTION=true is required for E2E: the SSRF-safe ' +
        'dispatcher blocks 127.0.0.1, which is where the mock provider lives.'
    );
  }

  if (process.env.NOT_SECURED !== 'true') {
    throw new Error(
      'NOT_SECURED=true is required for E2E so the auth cookie is a plain, ' +
        'non-httpOnly cookie that Playwright can seed directly.'
    );
  }

  await resetDatabase();
  await disconnectTestPrisma();
}
