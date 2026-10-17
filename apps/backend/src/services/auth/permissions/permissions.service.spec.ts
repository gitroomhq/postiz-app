import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';
import dayjs from 'dayjs';
import { pricing } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/pricing';
import { SubscriptionService } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.service';
import { PostsService } from '@gitroom/nestjs-libraries/database/prisma/posts/posts.service';
import { IntegrationService } from '@gitroom/nestjs-libraries/database/prisma/integrations/integration.service';
import { WebhooksService } from '@gitroom/nestjs-libraries/database/prisma/webhooks/webhooks.service';
import { AuthorizationActions, Sections } from './permission.exception.class';
import { PermissionsService } from './permissions.service';

/**
 * Successor to the 445-line suite deleted in 05720ec59. That version could not
 * simply be restored: it imported the enums from './permissions.service' (they
 * now live in './permission.exception.class'), and its Stripe-bypass case did
 * `process.env.STRIPE_PUBLISHABLE_KEY = undefined`, which stores the *string*
 * "undefined" - truthy - so the branch it claimed to cover never ran. The
 * scenario table is kept; the mechanics are rewritten.
 */

const CREATED_AT = new Date('2025-01-01T00:00:00.000Z');

describe('PermissionsService.check', () => {
  let subscriptionService: ReturnType<typeof mockDeep<SubscriptionService>>;
  let postsService: ReturnType<typeof mockDeep<PostsService>>;
  let integrationService: ReturnType<typeof mockDeep<IntegrationService>>;
  let webhooksService: ReturnType<typeof mockDeep<WebhooksService>>;
  let service: PermissionsService;

  const integrations = (count: number, refreshNeeded = 0) =>
    Array.from({ length: count }, (_, i) => ({
      id: `integration-${i}`,
      refreshNeeded: i < refreshNeeded,
    })) as never;

  beforeEach(() => {
    subscriptionService = mockDeep<SubscriptionService>();
    postsService = mockDeep<PostsService>();
    integrationService = mockDeep<IntegrationService>();
    webhooksService = mockDeep<WebhooksService>();

    service = new PermissionsService(
      subscriptionService,
      postsService,
      integrationService,
      webhooksService
    );

    // Billing checks only run when Stripe is configured; self-hosted instances
    // leave this unset. Individual tests opt out.
    process.env.STRIPE_PUBLISHABLE_KEY = 'pk_test_for_unit_tests';
    subscriptionService.getSubscriptionByOrganizationId.mockResolvedValue(null as never);
    subscriptionService.getSubscription.mockResolvedValue(null as never);
  });

  afterEach(() => {
    delete process.env.STRIPE_PUBLISHABLE_KEY;
  });

  describe('bypasses', () => {
    it('grants nothing when no permission is requested', () => {
      return service
        .check('org-1', CREATED_AT, 'USER', [])
        .then((ability) => {
          expect(ability.can(AuthorizationActions.Create, Sections.CHANNEL)).toBe(false);
        });
    });

    it('grants everything requested when Stripe is not configured', async () => {
      // The self-hosted path. Note `delete` rather than assigning undefined -
      // the latter stores the truthy string "undefined", which is precisely how
      // the deleted suite passed for the wrong reason.
      delete process.env.STRIPE_PUBLISHABLE_KEY;

      const ability = await service.check('org-1', CREATED_AT, 'USER', [
        [AuthorizationActions.Create, Sections.CHANNEL],
        [AuthorizationActions.Create, Sections.POSTS_PER_MONTH],
      ]);

      expect(ability.can(AuthorizationActions.Create, Sections.CHANNEL)).toBe(true);
      expect(ability.can(AuthorizationActions.Create, Sections.POSTS_PER_MONTH)).toBe(
        true
      );
      expect(integrationService.getIntegrationsList).not.toHaveBeenCalled();
    });

    // Characterisation, not an endorsement. The early return exists to skip
    // *billing* limits when nothing is being sold, but it runs before any rule
    // is evaluated, so Sections.ADMIN - a role check, not a billing limit - is
    // granted along with everything else. On a self-hosted instance this means
    // a plain USER passes the ADMIN policy on routes such as
    // POST /settings/team, which mints an organization invite.
    it('also grants ADMIN to a plain USER when Stripe is not configured', async () => {
      delete process.env.STRIPE_PUBLISHABLE_KEY;

      const ability = await service.check('org-1', CREATED_AT, 'USER', [
        [AuthorizationActions.Create, Sections.TEAM_MEMBERS],
        [AuthorizationActions.Create, Sections.ADMIN],
      ]);

      expect(ability.can(AuthorizationActions.Create, Sections.ADMIN)).toBe(true);
    });

    it('withholds ADMIN from the same USER once Stripe is configured', async () => {
      subscriptionService.getSubscriptionByOrganizationId.mockResolvedValue({
        subscriptionTier: 'STANDARD',
      } as never);

      const ability = await service.check('org-1', CREATED_AT, 'USER', [
        [AuthorizationActions.Create, Sections.ADMIN],
      ]);

      expect(ability.can(AuthorizationActions.Create, Sections.ADMIN)).toBe(false);
    });
  });

  describe('getPackageOptions', () => {
    it('defaults to the PRO tier when Stripe is not configured', async () => {
      delete process.env.STRIPE_PUBLISHABLE_KEY;

      const { options } = await service.getPackageOptions('org-1');

      expect(options.posts_per_month).toBe(pricing.PRO.posts_per_month);
    });

    it('defaults to FREE with a zero channel allowance when Stripe is configured', async () => {
      const { options } = await service.getPackageOptions('org-1');

      expect(options.channel).toBe(pricing.FREE.channel);
      expect(options.channel).toBe(0);
    });

    it('reports a sentinel channel allowance for any paid tier', async () => {
      // Paid tiers return -10 rather than a real number, so `-10 > total` is
      // always false and the decision falls entirely to subscription
      // .totalChannels. This is the actual paying-customer path.
      subscriptionService.getSubscriptionByOrganizationId.mockResolvedValue({
        subscriptionTier: 'STANDARD',
        totalChannels: 5,
      } as never);

      const { options } = await service.getPackageOptions('org-1');

      expect(options.channel).toBe(-10);
    });
  });

  describe('CHANNEL limits', () => {
    it('denies a FREE org with no channel allowance', async () => {
      integrationService.getIntegrationsList.mockResolvedValue(integrations(0));

      const ability = await service.check('org-1', CREATED_AT, 'USER', [
        [AuthorizationActions.Create, Sections.CHANNEL],
      ]);

      expect(ability.can(AuthorizationActions.Create, Sections.CHANNEL)).toBe(false);
    });

    it('grants while the subscription allowance exceeds the channel count', async () => {
      subscriptionService.getSubscriptionByOrganizationId.mockResolvedValue({
        subscriptionTier: 'STANDARD',
        totalChannels: 5,
      } as never);
      integrationService.getIntegrationsList.mockResolvedValue(integrations(3));

      const ability = await service.check('org-1', CREATED_AT, 'USER', [
        [AuthorizationActions.Create, Sections.CHANNEL],
      ]);

      expect(ability.can(AuthorizationActions.Create, Sections.CHANNEL)).toBe(true);
    });

    it('denies at exactly the allowance, because the comparison is strict', async () => {
      subscriptionService.getSubscriptionByOrganizationId.mockResolvedValue({
        subscriptionTier: 'STANDARD',
        totalChannels: 3,
      } as never);
      integrationService.getIntegrationsList.mockResolvedValue(integrations(3));

      const ability = await service.check('org-1', CREATED_AT, 'USER', [
        [AuthorizationActions.Create, Sections.CHANNEL],
      ]);

      expect(ability.can(AuthorizationActions.Create, Sections.CHANNEL)).toBe(false);
    });

    it('does not count channels that need a token refresh', async () => {
      subscriptionService.getSubscriptionByOrganizationId.mockResolvedValue({
        subscriptionTier: 'STANDARD',
        totalChannels: 3,
      } as never);
      // 5 integrations, 3 of which need refreshing, counts as 2.
      integrationService.getIntegrationsList.mockResolvedValue(integrations(5, 3));

      const ability = await service.check('org-1', CREATED_AT, 'USER', [
        [AuthorizationActions.Create, Sections.CHANNEL],
      ]);

      expect(ability.can(AuthorizationActions.Create, Sections.CHANNEL)).toBe(true);
    });

    it('lets an org at its limit refresh a channel it owns', async () => {
      subscriptionService.getSubscriptionByOrganizationId.mockResolvedValue({
        subscriptionTier: 'STANDARD',
        totalChannels: 3,
      } as never);
      integrationService.getIntegrationById.mockResolvedValue({
        id: 'own-channel',
      } as never);

      const ability = await service.check(
        'org-1',
        CREATED_AT,
        'USER',
        [[AuthorizationActions.Create, Sections.CHANNEL]],
        'own-channel'
      );

      expect(ability.can(AuthorizationActions.Create, Sections.CHANNEL)).toBe(true);
      // Short-circuits before counting, so the limit is never consulted.
      expect(integrationService.getIntegrationsList).not.toHaveBeenCalled();
    });

    it('refuses to refresh a channel belonging to another org', async () => {
      // The cross-tenant guard: getIntegrationById is scoped by orgId, so a
      // foreign channel id resolves to null and falls through to the limit.
      subscriptionService.getSubscriptionByOrganizationId.mockResolvedValue({
        subscriptionTier: 'STANDARD',
        totalChannels: 3,
      } as never);
      integrationService.getIntegrationById.mockResolvedValue(null as never);
      integrationService.getIntegrationsList.mockResolvedValue(integrations(3));

      const ability = await service.check(
        'org-1',
        CREATED_AT,
        'USER',
        [[AuthorizationActions.Create, Sections.CHANNEL]],
        'someone-elses-channel'
      );

      expect(ability.can(AuthorizationActions.Create, Sections.CHANNEL)).toBe(false);
      expect(integrationService.getIntegrationById).toHaveBeenCalledWith(
        'org-1',
        'someone-elses-channel'
      );
    });
  });

  describe('POSTS_PER_MONTH limits', () => {
    const standard = () =>
      subscriptionService.getSubscriptionByOrganizationId.mockResolvedValue({
        subscriptionTier: 'STANDARD',
      } as never);

    it('grants below the monthly allowance and denies at or above it', async () => {
      const allowance = pricing.STANDARD.posts_per_month;

      for (const [count, expected] of [
        [allowance - 1, true],
        [allowance, false],
        [allowance + 50, false],
      ] as const) {
        standard();
        postsService.countPostsFromDay.mockResolvedValue(count as never);

        const ability = await service.check('org-1', CREATED_AT, 'USER', [
          [AuthorizationActions.Create, Sections.POSTS_PER_MONTH],
        ]);

        expect(ability.can(AuthorizationActions.Create, Sections.POSTS_PER_MONTH)).toBe(
          expected
        );
      }
    });

    it('counts from the subscription anniversary, not the calendar month', async () => {
      standard();
      const createdAt = dayjs().subtract(3, 'month').subtract(10, 'day');
      subscriptionService.getSubscription.mockResolvedValue({
        createdAt: createdAt.toDate(),
      } as never);
      postsService.countPostsFromDay.mockResolvedValue(0 as never);

      await service.check('org-1', CREATED_AT, 'USER', [
        [AuthorizationActions.Create, Sections.POSTS_PER_MONTH],
      ]);

      const [, checkFrom] = postsService.countPostsFromDay.mock.calls[0];
      expect(dayjs(checkFrom as Date).format('YYYY-MM-DD')).toBe(
        createdAt.add(3, 'month').format('YYYY-MM-DD')
      );
    });

    it('falls back to the passed created_at when there is no subscription', async () => {
      standard();
      subscriptionService.getSubscription.mockResolvedValue(null as never);
      postsService.countPostsFromDay.mockResolvedValue(0 as never);

      await service.check('org-1', CREATED_AT, 'USER', [
        [AuthorizationActions.Create, Sections.POSTS_PER_MONTH],
      ]);

      expect(postsService.countPostsFromDay).toHaveBeenCalledOnce();
    });
  });

  describe('WEBHOOKS limits', () => {
    beforeEach(() => {
      subscriptionService.getSubscriptionByOrganizationId.mockResolvedValue({
        subscriptionTier: 'STANDARD',
      } as never);
    });

    it('grants below the webhook allowance', async () => {
      webhooksService.getTotal.mockResolvedValue(0 as never);

      const ability = await service.check('org-1', CREATED_AT, 'USER', [
        [AuthorizationActions.Create, Sections.WEBHOOKS],
      ]);

      expect(ability.can(AuthorizationActions.Create, Sections.WEBHOOKS)).toBe(true);
    });

    it('denies at the webhook allowance', async () => {
      webhooksService.getTotal.mockResolvedValue(
        pricing.STANDARD.webhooks as never
      );

      const ability = await service.check('org-1', CREATED_AT, 'USER', [
        [AuthorizationActions.Create, Sections.WEBHOOKS],
      ]);

      expect(ability.can(AuthorizationActions.Create, Sections.WEBHOOKS)).toBe(false);
    });

    it('only ever grants Create, whatever action was requested', async () => {
      // Characterisation of a real quirk: the branch hard-codes
      // `can(AuthorizationActions.Create, section)`, so asking to Delete a
      // webhook is denied even while under the limit.
      webhooksService.getTotal.mockResolvedValue(0 as never);

      const ability = await service.check('org-1', CREATED_AT, 'USER', [
        [AuthorizationActions.Delete, Sections.WEBHOOKS],
      ]);

      expect(ability.can(AuthorizationActions.Delete, Sections.WEBHOOKS)).toBe(false);
      expect(ability.can(AuthorizationActions.Create, Sections.WEBHOOKS)).toBe(true);
    });
  });

  describe('ADMIN section', () => {
    beforeEach(() => {
      subscriptionService.getSubscriptionByOrganizationId.mockResolvedValue({
        subscriptionTier: 'STANDARD',
      } as never);
    });

    it.each([
      ['USER', false],
      ['ADMIN', true],
      ['SUPERADMIN', true],
    ] as const)('role %s -> %s', async (role, expected) => {
      const ability = await service.check('org-1', CREATED_AT, role, [
        [AuthorizationActions.Create, Sections.ADMIN],
      ]);

      expect(ability.can(AuthorizationActions.Create, Sections.ADMIN)).toBe(expected);
    });
  });

  it('does not leak a grant from one section to another', async () => {
    subscriptionService.getSubscriptionByOrganizationId.mockResolvedValue({
      subscriptionTier: 'STANDARD',
    } as never);

    const ability = await service.check('org-1', CREATED_AT, 'USER', [
      [AuthorizationActions.Create, Sections.AI],
    ]);

    expect(ability.can(AuthorizationActions.Create, Sections.AI)).toBe(true);
    expect(ability.can(AuthorizationActions.Create, Sections.CHANNEL)).toBe(false);
  });
});
