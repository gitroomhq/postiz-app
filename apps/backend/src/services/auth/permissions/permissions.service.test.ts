import { mock } from 'jest-mock-extended';
import { IntegrationService } from '@gitroom/nestjs-libraries/database/prisma/integrations/integration.service';
import { PostsService } from '@gitroom/nestjs-libraries/database/prisma/posts/posts.service';
import { SubscriptionService } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.service';
import { PermissionsService } from './permissions.service';
import { AuthorizationActions, Sections } from './permissions.service';
import { Period, SubscriptionTier } from '@prisma/client';

// Mock dos serviços dependentes
const mockSubscriptionService = mock<SubscriptionService>();
const mockPostsService = mock<PostsService>();
const mockIntegrationService = mock<IntegrationService>();

describe('PermissionsService', () => {
  let service: PermissionsService;

  // Configuração inicial antes de cada teste
  beforeEach(() => {
    process.env.STRIPE_PUBLISHABLE_KEY = 'mock_stripe_key';
    service = new PermissionsService(
      mockSubscriptionService,
      mockPostsService,
      mockIntegrationService
    );
  });

  // Mocks reutilizáveis para `getPackageOptions`
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
    describe('Bypass de verificação (64)', () => {

      it('CT1 - Bypass por Lista Vazia', async () => {
        // Configuração: STRIPE_PUBLISHABLE_KEY existe e requestedPermission está vazia

        // Execução: chamada do método check com lista vazia de permissões
        const result = await service.check(
          'mock-org-id',
          new Date(),
          'ADMIN',
          [] // requestedPermission vazia
        );

        // Verificação: não foi solicitado, não tem autorização
        expect(result.cannot(AuthorizationActions.Create, Sections.CHANNEL)).toBe(true);
      });

      it('CT2 - Bypass por Stripe Ausente', async () => {
        // Configuração: STRIPE_PUBLISHABLE_KEY não existe
        process.env.STRIPE_PUBLISHABLE_KEY = undefined;
        // Mock necessário para evitar o erro de filter undefined
        jest.spyOn(mockIntegrationService, 'getIntegrationsList').mockResolvedValue([
          { ...baseIntegration, refreshNeeded: false }
        ]);
        // Mock do getPackageOptions (mesmo que não seja usado devido ao bypass)
        jest.spyOn(service, 'getPackageOptions').mockResolvedValue({
          subscription: baseSubscription,
          options: baseOptions,
        });
        // Lista com permissões solicitadas
        const requestedPermissions: Array<[AuthorizationActions, Sections]> = [
          [AuthorizationActions.Read, Sections.CHANNEL],
          [AuthorizationActions.Create, Sections.AI]
        ];
        // Execução: chamada do método check
        const result = await service.check(
          'mock-org-id',
          new Date(),
          'USER',
          requestedPermissions
        );
        // Verificação: deve permitir todas as ações solicitadas devido à ausência da chave Stripe
        expect(result.can(AuthorizationActions.Read, Sections.CHANNEL)).toBe(true);
        expect(result.can(AuthorizationActions.Create, Sections.AI)).toBe(true);
      });

      it('CT3 - Sem Bypass', async () => {
        // Lista com permissões solicitadas
        const requestedPermissions: Array<[AuthorizationActions, Sections]> = [
          [AuthorizationActions.Read, Sections.CHANNEL],
          [AuthorizationActions.Create, Sections.AI]
        ];
        // Mock do getPackageOptions para forçar um cenário sem permissões
        jest.spyOn(service, 'getPackageOptions').mockResolvedValue({
          subscription: { ...baseSubscription, totalChannels: 0 },
          options: {
            ...baseOptions,
            channel: 0,
            ai: false
          },
        });
        // Mock do getIntegrationsList para o cenário de canais
        jest.spyOn(mockIntegrationService, 'getIntegrationsList').mockResolvedValue([
          { ...baseIntegration, refreshNeeded: false }
        ]);
        // Execução: chamada do método check
        const result = await service.check(
          'mock-org-id',
          new Date(),
          'USER',
          requestedPermissions
        );
        // Verificação: não deve permitir as ações solicitadas pois não há bypass
        expect(result.can(AuthorizationActions.Read, Sections.CHANNEL)).toBe(false);
        expect(result.can(AuthorizationActions.Create, Sections.AI)).toBe(false);
      });
    });

    describe('Permissão de Canais (82/87)', () => {
      it('CT4 - Todas as Condições Verdadeiras', async () => {
        // Mock do getPackageOptions para configurar limites de canais
        jest.spyOn(service, 'getPackageOptions').mockResolvedValue({
          subscription: { ...baseSubscription, totalChannels: 10 },
          options: { ...baseOptions, channel: 10 },
        });

        // Mock do getIntegrationsList para configurar canais existentes
        jest.spyOn(mockIntegrationService, 'getIntegrationsList').mockResolvedValue([
          { ...baseIntegration, refreshNeeded: false },
          { ...baseIntegration, refreshNeeded: false },
          { ...baseIntegration, refreshNeeded: false },
        ]);

        // Lista com permissões solicitadas
        const requestedPermissions: Array<[AuthorizationActions, Sections]> = [
          [AuthorizationActions.Create, Sections.CHANNEL]
        ];

        // Execução: chamada do método check
        const result = await service.check(
          'mock-org-id',
          new Date(),
          'USER',
          requestedPermissions
        );
        // Verificação: deve permitir a ação solicitada
        expect(result.can(AuthorizationActions.Create, Sections.CHANNEL)).toBe(true);
      });

      it('CT5 - Canal Com Limite de Opções', async () => {
        // Mock do getPackageOptions para configurar limites de canais
        jest.spyOn(service, 'getPackageOptions').mockResolvedValue({
          subscription: { ...baseSubscription, totalChannels: 3 },
          options: { ...baseOptions, channel: 10 },
        });
        // Mock do getIntegrationsList para configurar canais existentes
        jest.spyOn(mockIntegrationService, 'getIntegrationsList').mockResolvedValue([
          { ...baseIntegration, refreshNeeded: false },
          { ...baseIntegration, refreshNeeded: false },
          { ...baseIntegration, refreshNeeded: false },
        ]);
        // Lista com permissões solicitadas
        const requestedPermissions: Array<[AuthorizationActions, Sections]> = [
          [AuthorizationActions.Create, Sections.CHANNEL]
        ];
        // Execução: chamada do método check
        const result = await service.check(
          'mock-org-id',
          new Date(),
          'USER',
          requestedPermissions
        );
        // Verificação: deve permitir a ação solicitada
        expect(result.can(AuthorizationActions.Create, Sections.CHANNEL)).toBe(true);
      });
      it('CT6 - Canal Com Limite de Subscrição', async () => {
        // Mock do getPackageOptions para configurar limites de canais
        jest.spyOn(service, 'getPackageOptions').mockResolvedValue({
          subscription: { ...baseSubscription, totalChannels: 10 },
          options: { ...baseOptions, channel: 3 },
        });
        // Mock do getIntegrationsList para configurar canais existentes
        jest.spyOn(mockIntegrationService, 'getIntegrationsList').mockResolvedValue([
          { ...baseIntegration, refreshNeeded: false },
          { ...baseIntegration, refreshNeeded: false },
          { ...baseIntegration, refreshNeeded: false },
        ]);

        // Lista com permissões solicitadas
        const requestedPermissions: Array<[AuthorizationActions, Sections]> = [
          [AuthorizationActions.Create, Sections.CHANNEL]
        ];
        // Execução: chamada do método check
        const result = await service.check(
          'mock-org-id',
          new Date(),
          'USER',
          requestedPermissions
        );
        // Verificação: deve permitir a ação solicitada
        expect(result.can(AuthorizationActions.Create, Sections.CHANNEL)).toBe(true);
      });
      it('CT7 - Canal Sem Limites Disponíveis', async () => {
        // Mock do getPackageOptions para configurar limites de canais
        jest.spyOn(service, 'getPackageOptions').mockResolvedValue({
          subscription: { ...baseSubscription, totalChannels: 3 },
          options: { ...baseOptions, channel: 3 },
        });
        // Mock do getIntegrationsList para configurar canais existentes
        jest.spyOn(mockIntegrationService, 'getIntegrationsList').mockResolvedValue([
          { ...baseIntegration, refreshNeeded: false },
          { ...baseIntegration, refreshNeeded: false },
          { ...baseIntegration, refreshNeeded: false },
        ]);
        // Lista com permissões solicitadas
        const requestedPermissions: Array<[AuthorizationActions, Sections]> = [
          [AuthorizationActions.Create, Sections.CHANNEL]
        ];
        // Execução: chamada do método check
        const result = await service.check(
          'mock-org-id',
          new Date(),
          'USER',
          requestedPermissions
        );
        // Verificação: não deve permitir a ação solicitada
        expect(result.can(AuthorizationActions.Create, Sections.CHANNEL)).toBe(false);
      });
      it('CT8 - Seção Diferente de Canal', async () => {
        // Mock do getPackageOptions para configurar limites de canais
        jest.spyOn(service, 'getPackageOptions').mockResolvedValue({
          subscription: { ...baseSubscription, totalChannels: 10 },
          options: { ...baseOptions, channel: 10 },
        });
        // Mock do getIntegrationsList para configurar canais existentes
        jest.spyOn(mockIntegrationService, 'getIntegrationsList').mockResolvedValue([
          { ...baseIntegration, refreshNeeded: false },
          { ...baseIntegration, refreshNeeded: false },
          { ...baseIntegration, refreshNeeded: false },
        ]);
        // Lista com permissões solicitadas
        const requestedPermissions: Array<[AuthorizationActions, Sections]> = [
          [AuthorizationActions.Create, Sections.AI]  // Solicitando permissão para AI em vez de CHANNEL
        ];
        // Execução: chamada do método check
        const result = await service.check(
          'mock-org-id',
          new Date(),
          'USER',
          requestedPermissions
        );
        // Verificação: não deve permitir a ação solicitada em CHANNEL
        expect(result.can(AuthorizationActions.Create, Sections.CHANNEL)).toBe(false);
      });
    });
    describe('Permissão de Posts Mensais (97/110)', () => {
      it('CT9 - Posts Dentro do Limite', async () => {
        // Mock do getPackageOptions para configurar limite de posts
        jest.spyOn(service, 'getPackageOptions').mockResolvedValue({
          subscription: baseSubscription,
          options: { ...baseOptions, posts_per_month: 100 },
        });
        // Mock do getSubscription
        jest.spyOn(mockSubscriptionService, 'getSubscription').mockResolvedValue({
          ...baseSubscription,
          createdAt: new Date(),
        });
        // Mock do countPostsFromDay para retornar quantidade dentro do limite
        jest.spyOn(mockPostsService, 'countPostsFromDay').mockResolvedValue(50);
        // Lista com permissões solicitadas
        const requestedPermissions: Array<[AuthorizationActions, Sections]> = [
          [AuthorizationActions.Create, Sections.POSTS_PER_MONTH]
        ];
        // Execução: chamada do método check
        const result = await service.check(
          'mock-org-id',
          new Date(),
          'USER',
          requestedPermissions
        );
        // Verificação: deve permitir a ação solicitada
        expect(result.can(AuthorizationActions.Create, Sections.POSTS_PER_MONTH)).toBe(true);
      });
      it('CT10 - Posts Excedem o Limite', async () => {
        // Mock do getPackageOptions para configurar limite de posts
        jest.spyOn(service, 'getPackageOptions').mockResolvedValue({
          subscription: baseSubscription,
          options: { ...baseOptions, posts_per_month: 100 },
        });
        // Mock do getSubscription
        jest.spyOn(mockSubscriptionService, 'getSubscription').mockResolvedValue({
          ...baseSubscription,
          createdAt: new Date(),
        });
        // Mock do countPostsFromDay para retornar quantidade acima do limite
        jest.spyOn(mockPostsService, 'countPostsFromDay').mockResolvedValue(150);

        // Lista com permissões solicitadas
        const requestedPermissions: Array<[AuthorizationActions, Sections]> = [
          [AuthorizationActions.Create, Sections.POSTS_PER_MONTH]
        ];
        // Execução: chamada do método check
        const result = await service.check(
          'mock-org-id',
          new Date(),
          'USER',
          requestedPermissions
        );
        // Verificação: não deve permitir a ação solicitada
        expect(result.can(AuthorizationActions.Create, Sections.POSTS_PER_MONTH)).toBe(false);
      });
      it('CT11 - Seção Diferente Com Posts Dentro do Limite', async () => {
        // Mock do getPackageOptions para configurar limite de posts
        jest.spyOn(service, 'getPackageOptions').mockResolvedValue({
          subscription: baseSubscription,
          options: { ...baseOptions, posts_per_month: 100 },
        });
        // Mock do getSubscription
        jest.spyOn(mockSubscriptionService, 'getSubscription').mockResolvedValue({
          ...baseSubscription,
          createdAt: new Date(),
        });
        // Mock do countPostsFromDay para retornar quantidade dentro do limite
        jest.spyOn(mockPostsService, 'countPostsFromDay').mockResolvedValue(50);
        // Lista com permissões solicitadas
        const requestedPermissions: Array<[AuthorizationActions, Sections]> = [
          [AuthorizationActions.Create, Sections.AI]  // Solicitando permissão para AI em vez de POSTS_PER_MONTH
        ];
        // Execução: chamada do método check
        const result = await service.check(
          'mock-org-id',
          new Date(),
          'USER',
          requestedPermissions
        );
        // Verificação: não deve permitir a ação solicitada em POSTS_PER_MONTH
        expect(result.can(AuthorizationActions.Create, Sections.POSTS_PER_MONTH)).toBe(false);
      });
    });
  });
});
