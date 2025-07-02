import { mock } from 'jest-mock-extended';
import { IntegrationService } from '@gitroom/nestjs-libraries/database/prisma/integrations/integration.service';
import { PostsService } from '@gitroom/nestjs-libraries/database/prisma/posts/posts.service';
import { SubscriptionService } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.service';
import { WebhooksService } from '@gitroom/nestjs-libraries/database/prisma/webhooks/webhooks.service';
import { PermissionsService } from './permissions.service';
import { AuthorizationActions, Sections } from './permissions.service';
import { Period, SubscriptionTier } from '@prisma/client';

// Mock of dependent services
const mockSubscriptionService = mock<SubscriptionService>();
const mockPostsService = mock<PostsService>();
const mockIntegrationService = mock<IntegrationService>();
const mockWebHookService = mock<WebhooksService>();

describe('PermissionsService', () => {
  let service: PermissionsService;

  // Initial setup before each test
  beforeEach(() => {
    process.env.STRIPE_PUBLISHABLE_KEY = 'mock_stripe_key';
    service = new PermissionsService(
      mockSubscriptionService,
      mockPostsService,
      mockIntegrationService,
      mockWebHookService
    );
  });

  // Reusable mocks for `getPackageOptions`
  const baseSubscription = {
    id: 'mock-id',
    organizationId: 'mock-org-id',
    subscriptionTier: 'PRO' as SubscriptionTier,
    identifier: 'mock-identifier',
    cancelAt: new Date(),
    period: {} as Period,
    totalChannels: 5,
    isLifetime: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    disabled: false,
    tokenExpiration: new Date(),
    profile: 'mock-profile',
    postingTimes: '[]',
    lastPostedAt: new Date(),
  };

  const baseOptions = {
    channel: 10,
    current: 'mock-current',
    month_price: 20,
    year_price: 200,
    posts_per_month: 100,
    team_members: true,
    community_features: true,
    featured_by_gitroom: true,
    ai: true,
    import_from_channels: true,
    image_generator: false,
    image_generation_count: 50,
    public_api: true,
    webhooks: 10,
    autoPost: true, // Added the missing property
  };

  const baseIntegration = {
    id: 'mock-integration-id',
    organizationId: 'mock-org-id',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: new Date(),
    additionalSettings: '{}',
    refreshNeeded: false,
    refreshToken: 'mock-refresh-token',
    name: 'Mock Integration',
    internalId: 'mock-internal-id',
    picture: 'mock-picture-url',
    providerIdentifier: 'mock-provider',
    token: 'mock-token',
    type: 'social',
    inBetweenSteps: false,
    disabled: false,
    tokenExpiration: new Date(),
    profile: 'mock-profile',
    postingTimes: '[]',
    lastPostedAt: new Date(),
    customInstanceDetails: 'mock-details',
    customerId: 'mock-customer-id',
    rootInternalId: 'mock-root-id',
    customer: {
      id: 'mock-customer-id',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: new Date(),
      name: 'Mock Customer',
      orgId: 'mock-org-id',
    },
  };

  describe('check()', () => {
    describe('Verification Bypass (64)', () => {
      it('Bypass for Empty List', async () => {
        // Setup: STRIPE_PUBLISHABLE_KEY exists and requestedPermission is empty

        // Execution: call the check method with an empty list of permissions
        const result = await service.check(
          'mock-org-id',
          new Date(),
          'ADMIN',
          [] // empty requestedPermission
        );

        // Verification: not requested, no authorization
        expect(
          result.cannot(AuthorizationActions.Create, Sections.CHANNEL)
        ).toBe(true);
      });

      it('Bypass for Missing Stripe', async () => {
        // Setup: STRIPE_PUBLISHABLE_KEY does not exist
        process.env.STRIPE_PUBLISHABLE_KEY = undefined;
        // Necessary mock to avoid undefined filter error
        jest
          .spyOn(mockIntegrationService, 'getIntegrationsList')
          .mockResolvedValue([{ ...baseIntegration, refreshNeeded: false }]);
        // Mock of getPackageOptions (even if not used due to bypass)
        jest.spyOn(service, 'getPackageOptions').mockResolvedValue({
          subscription: baseSubscription,
          options: baseOptions,
        });
        // List of requested permissions
        const requestedPermissions: Array<[AuthorizationActions, Sections]> = [
          [AuthorizationActions.Read, Sections.CHANNEL],
          [AuthorizationActions.Create, Sections.AI],
        ];
        // Execution: call the check method
        const result = await service.check(
          'mock-org-id',
          new Date(),
          'USER',
          requestedPermissions
        );
        // Verification: should allow all requested actions due to the absence of the Stripe key
        expect(result.can(AuthorizationActions.Read, Sections.CHANNEL)).toBe(
          true
        );
        expect(result.can(AuthorizationActions.Create, Sections.AI)).toBe(true);
      });

      it('No Bypass', async () => {
        // List of requested permissions
        const requestedPermissions: Array<[AuthorizationActions, Sections]> = [
          [AuthorizationActions.Read, Sections.CHANNEL],
          [AuthorizationActions.Create, Sections.AI],
        ];
        // Mock of getPackageOptions to force a scenario without permissions
        jest.spyOn(service, 'getPackageOptions').mockResolvedValue({
          subscription: { ...baseSubscription, totalChannels: 0 },
          options: {
            ...baseOptions,
            channel: 0,
            ai: false,
          },
        });
        // Mock of getIntegrationsList for the channel scenario
        jest
          .spyOn(mockIntegrationService, 'getIntegrationsList')
          .mockResolvedValue([{ ...baseIntegration, refreshNeeded: false }]);
        // Execution: call the check method
        const result = await service.check(
          'mock-org-id',
          new Date(),
          'USER',
          requestedPermissions
        );
        // Verification: should not allow the requested actions as there is no bypass
        expect(result.can(AuthorizationActions.Read, Sections.CHANNEL)).toBe(
          false
        );
        expect(result.can(AuthorizationActions.Create, Sections.AI)).toBe(
          false
        );
      });
    });

    describe('Channel Permission (82/87)', () => {
      it('All Conditions True', async () => {
        // Mock of getPackageOptions to set channel limits
        jest.spyOn(service, 'getPackageOptions').mockResolvedValue({
          subscription: { ...baseSubscription, totalChannels: 10 },
          options: { ...baseOptions, channel: 10 },
        });

        // Mock of getIntegrationsList to set existing channels
        jest
          .spyOn(mockIntegrationService, 'getIntegrationsList')
          .mockResolvedValue([
            { ...baseIntegration, refreshNeeded: false },
            { ...baseIntegration, refreshNeeded: false },
            { ...baseIntegration, refreshNeeded: false },
          ]);

        // List of requested permissions
        const requestedPermissions: Array<[AuthorizationActions, Sections]> = [
          [AuthorizationActions.Create, Sections.CHANNEL],
        ];

        // Execution: call the check method
        const result = await service.check(
          'mock-org-id',
          new Date(),
          'USER',
          requestedPermissions
        );
        // Verification: should allow the requested action
        expect(result.can(AuthorizationActions.Create, Sections.CHANNEL)).toBe(
          true
        );
      });

      it('Channel With Option Limit', async () => {
        // Mock of getPackageOptions to set channel limits
        jest.spyOn(service, 'getPackageOptions').mockResolvedValue({
          subscription: { ...baseSubscription, totalChannels: 3 },
          options: { ...baseOptions, channel: 10 },
        });
        // Mock of getIntegrationsList to set existing channels
        jest
          .spyOn(mockIntegrationService, 'getIntegrationsList')
          .mockResolvedValue([
            { ...baseIntegration, refreshNeeded: false },
            { ...baseIntegration, refreshNeeded: false },
            { ...baseIntegration, refreshNeeded: false },
          ]);
        // List of requested permissions
        const requestedPermissions: Array<[AuthorizationActions, Sections]> = [
          [AuthorizationActions.Create, Sections.CHANNEL],
        ];
        // Execution: call the check method
        const result = await service.check(
          'mock-org-id',
          new Date(),
          'USER',
          requestedPermissions
        );
        // Verification: should allow the requested action
        expect(result.can(AuthorizationActions.Create, Sections.CHANNEL)).toBe(
          true
        );
      });

      it('Channel With Subscription Limit', async () => {
        // Mock of getPackageOptions to set channel limits
        jest.spyOn(service, 'getPackageOptions').mockResolvedValue({
          subscription: { ...baseSubscription, totalChannels: 10 },
          options: { ...baseOptions, channel: 3 },
        });
        // Mock of getIntegrationsList to set existing channels
        jest
          .spyOn(mockIntegrationService, 'getIntegrationsList')
          .mockResolvedValue([
            { ...baseIntegration, refreshNeeded: false },
            { ...baseIntegration, refreshNeeded: false },
            { ...baseIntegration, refreshNeeded: false },
          ]);

        // List of requested permissions
        const requestedPermissions: Array<[AuthorizationActions, Sections]> = [
          [AuthorizationActions.Create, Sections.CHANNEL],
        ];
        // Execution: call the check method
        const result = await service.check(
          'mock-org-id',
          new Date(),
          'USER',
          requestedPermissions
        );
        // Verification: should allow the requested action
        expect(result.can(AuthorizationActions.Create, Sections.CHANNEL)).toBe(
          true
        );
      });
      it('Channel Without Available Limits', async () => {
        // Mock of getPackageOptions to set channel limits
        jest.spyOn(service, 'getPackageOptions').mockResolvedValue({
          subscription: { ...baseSubscription, totalChannels: 3 },
          options: { ...baseOptions, channel: 3 },
        });
        // Mock of getIntegrationsList to set existing channels
        jest
          .spyOn(mockIntegrationService, 'getIntegrationsList')
          .mockResolvedValue([
            { ...baseIntegration, refreshNeeded: false },
            { ...baseIntegration, refreshNeeded: false },
            { ...baseIntegration, refreshNeeded: false },
          ]);
        // List of requested permissions
        const requestedPermissions: Array<[AuthorizationActions, Sections]> = [
          [AuthorizationActions.Create, Sections.CHANNEL],
        ];
        // Execution: call the check method
        const result = await service.check(
          'mock-org-id',
          new Date(),
          'USER',
          requestedPermissions
        );
        // Verification: should not allow the requested action
        expect(result.can(AuthorizationActions.Create, Sections.CHANNEL)).toBe(
          false
        );
      });
      it('Section Different from Channel', async () => {
        // Mock of getPackageOptions to set channel limits
        jest.spyOn(service, 'getPackageOptions').mockResolvedValue({
          subscription: { ...baseSubscription, totalChannels: 10 },
          options: { ...baseOptions, channel: 10 },
        });
        // Mock of getIntegrationsList to set existing channels
        jest
          .spyOn(mockIntegrationService, 'getIntegrationsList')
          .mockResolvedValue([
            { ...baseIntegration, refreshNeeded: false },
            { ...baseIntegration, refreshNeeded: false },
            { ...baseIntegration, refreshNeeded: false },
          ]);
        // List of requested permissions
        const requestedPermissions: Array<[AuthorizationActions, Sections]> = [
          [AuthorizationActions.Create, Sections.AI], // Requesting permission for AI instead of CHANNEL
        ];
        // Execution: call the check method
        const result = await service.check(
          'mock-org-id',
          new Date(),
          'USER',
          requestedPermissions
        );
        // Verification: should not allow the requested action in CHANNEL
        expect(result.can(AuthorizationActions.Create, Sections.CHANNEL)).toBe(
          false
        );
      });
    });
    describe('Monthly Posts Permission (97/110)', () => {
      it('Posts Within Limit', async () => {
        // Mock of getPackageOptions to set post limits
        jest.spyOn(service, 'getPackageOptions').mockResolvedValue({
          subscription: baseSubscription,
          options: { ...baseOptions, posts_per_month: 100 },
        });
        // Mock of getSubscription
        jest
          .spyOn(mockSubscriptionService, 'getSubscription')
          .mockResolvedValue({
            ...baseSubscription,
            createdAt: new Date(),
          });
        // Mock of countPostsFromDay to return quantity within the limit
        jest.spyOn(mockPostsService, 'countPostsFromDay').mockResolvedValue(50);
        // List of requested permissions
        const requestedPermissions: Array<[AuthorizationActions, Sections]> = [
          [AuthorizationActions.Create, Sections.POSTS_PER_MONTH],
        ];
        // Execution: call the check method
        const result = await service.check(
          'mock-org-id',
          new Date(),
          'USER',
          requestedPermissions
        );
        // Verification: should allow the requested action
        expect(
          result.can(AuthorizationActions.Create, Sections.POSTS_PER_MONTH)
        ).toBe(true);
      });
      it('Posts Exceed Limit', async () => {
        // Mock of getPackageOptions to set post limits
        jest.spyOn(service, 'getPackageOptions').mockResolvedValue({
          subscription: baseSubscription,
          options: { ...baseOptions, posts_per_month: 100 },
        });
        // Mock of getSubscription
        jest
          .spyOn(mockSubscriptionService, 'getSubscription')
          .mockResolvedValue({
            ...baseSubscription,
            createdAt: new Date(),
          });
        // Mock of countPostsFromDay to return quantity above the limit
        jest
          .spyOn(mockPostsService, 'countPostsFromDay')
          .mockResolvedValue(150);

        // List of requested permissions
        const requestedPermissions: Array<[AuthorizationActions, Sections]> = [
          [AuthorizationActions.Create, Sections.POSTS_PER_MONTH],
        ];
        // Execution: call the check method
        const result = await service.check(
          'mock-org-id',
          new Date(),
          'USER',
          requestedPermissions
        );
        // Verification: should not allow the requested action
        expect(
          result.can(AuthorizationActions.Create, Sections.POSTS_PER_MONTH)
        ).toBe(false);
      });
      it('Section Different with Posts Within Limit', async () => {
        // Mock of getPackageOptions to set post limits
        jest.spyOn(service, 'getPackageOptions').mockResolvedValue({
          subscription: baseSubscription,
          options: { ...baseOptions, posts_per_month: 100 },
        });
        // Mock of getSubscription
        jest
          .spyOn(mockSubscriptionService, 'getSubscription')
          .mockResolvedValue({
            ...baseSubscription,
            createdAt: new Date(),
          });
        // Mock of countPostsFromDay to return quantity within the limit
        jest.spyOn(mockPostsService, 'countPostsFromDay').mockResolvedValue(50);
        // List of requested permissions
        const requestedPermissions: Array<[AuthorizationActions, Sections]> = [
          [AuthorizationActions.Create, Sections.AI], // Requesting permission for AI instead of POSTS_PER_MONTH
        ];
        // Execution: call the check method
        const result = await service.check(
          'mock-org-id',
          new Date(),
          'USER',
          requestedPermissions
        );
        // Verification: should not allow the requested action in POSTS_PER_MONTH
        expect(
          result.can(AuthorizationActions.Create, Sections.POSTS_PER_MONTH)
        ).toBe(false);
      });
    });
  });
});
