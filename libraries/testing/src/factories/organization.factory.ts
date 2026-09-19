import { randomUUID } from 'node:crypto';
import type { Integration, Organization, User } from '@prisma/client';
import { AuthService } from '@gitroom/helpers/auth/auth.service';
import { testPrisma } from '../prisma/test.database';

export const TEST_PASSWORD = 'E2ePassw0rd!';

/**
 * Create an activated user in an organization they administer.
 *
 * The shape is dictated by AuthMiddleware: it re-resolves the user by id and
 * rejects `!user.activated` or `deletedAt`, then filters organizations to those
 * whose membership is not disabled. An org without `apiKey` also causes a write
 * on the first authenticated request, so it is seeded here to keep tests
 * deterministic.
 */
export async function createOrgWithUser(
  options: {
    role?: 'USER' | 'ADMIN' | 'SUPERADMIN';
    user?: Partial<User>;
    organization?: Partial<Organization>;
  } = {}
): Promise<{
  user: User;
  organization: Organization;
  token: string;
  /**
   * The UserOrganization row id. This - not the user id - is what the
   * `impersonate` header carries, because AuthMiddleware resolves it through
   * OrganizationRepository.getUserOrg, which queries userOrganization by id.
   */
  membershipId: string;
}> {
  const prisma = testPrisma();

  const user = await prisma.user.create({
    data: {
      email: `test-${randomUUID()}@postiz.test`,
      password: AuthService.hashPassword(TEST_PASSWORD),
      providerName: 'LOCAL',
      name: 'Test User',
      timezone: 0,
      activated: true,
      ...options.user,
    },
  });

  const organization = await prisma.organization.create({
    data: {
      name: `Test Org ${randomUUID().slice(0, 8)}`,
      apiKey: AuthService.fixedEncryption(randomUUID().replace(/-/g, '').slice(0, 20)),
      users: {
        create: {
          userId: user.id,
          role: options.role ?? 'SUPERADMIN',
          disabled: false,
        },
      },
      ...options.organization,
    },
  });

  const membership = await prisma.userOrganization.findFirstOrThrow({
    where: { userId: user.id, organizationId: organization.id },
  });

  return {
    user,
    organization,
    membershipId: membership.id,
    // AuthMiddleware reads only `id` from the token body and re-resolves the
    // rest from the database, so this is all a valid session needs.
    token: AuthService.signJWT({ id: user.id, email: user.email }),
  };
}

/**
 * A connected channel. `token` is stored in plaintext by
 * IntegrationRepository.createOrUpdateIntegration - only apiKey, OAuth app
 * secrets and customInstanceDetails go through fixedEncryption - so seeding it
 * needs no encryption.
 */
export async function createIntegration(
  organizationId: string,
  over: Partial<Integration> = {}
): Promise<Integration> {
  const internalId = over.internalId ?? `mock-account-${randomUUID().slice(0, 8)}`;

  return testPrisma().integration.create({
    data: {
      internalId,
      rootInternalId: internalId,
      organizationId,
      name: 'Test Mastodon',
      providerIdentifier: 'mastodon',
      type: 'social',
      token: 'e2e-mastodon-token',
      profile: 'e2e',
      disabled: false,
      refreshNeeded: false,
      inBetweenSteps: false,
      additionalSettings: '[]',
      tokenExpiration: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      ...over,
    },
  });
}
