import { RefreshIntegrationService } from './refresh.integration.service';

const integration = (over: Record<string, unknown> = {}) => ({
  id: 'i1',
  organizationId: 'org',
  name: 'My channel',
  picture: 'https://pic.test',
  internalId: 'ext-1',
  rootInternalId: 'ext-1',
  providerIdentifier: 'mastodon',
  refreshToken: 'old-refresh',
  ...over,
});

const tokens = (over: Record<string, unknown> = {}) => ({
  accessToken: 'fresh',
  refreshToken: 'next',
  expiresIn: 3600,
  id: 'ext-1',
  name: 'My channel',
  picture: '',
  username: 'me',
  ...over,
});

const mocks = () => ({
  integrationManager: { getSocialIntegration: vi.fn() },
  integrationService: {
    createOrUpdateIntegration: vi.fn(),
    refreshNeeded: vi.fn(),
    informAboutRefreshError: vi.fn(),
    disconnectChannel: vi.fn(),
    setBetweenRefreshSteps: vi.fn(),
  },
  temporalService: { client: { getRawClient: vi.fn() } },
});

const build = () => {
  const m = mocks();
  const service = new RefreshIntegrationService(
    m.integrationManager as never,
    m.integrationService as never,
    m.temporalService as never
  );

  return { service, ...m };
};

describe('RefreshIntegrationService.refresh', () => {
  it('stores the new tokens against the same channel', async () => {
    const { service, integrationManager, integrationService } = build();
    integrationManager.getSocialIntegration.mockReturnValue({
      oneTimeToken: false,
      refreshToken: async () => tokens(),
    } as never);

    await expect(service.refresh(integration() as never)).resolves.toMatchObject({
      accessToken: 'fresh',
    });

    expect(integrationService.createOrUpdateIntegration).toHaveBeenCalledWith(
      undefined,
      false,
      'org',
      'My channel',
      'https://pic.test',
      'social',
      'ext-1',
      'mastodon',
      'fresh',
      'next',
      3600
    );
  });

  it('disconnects the channel and tells the user when the provider throws', async () => {
    const { service, integrationManager, integrationService } = build();
    integrationManager.getSocialIntegration.mockReturnValue({
      refreshToken: async () => {
        throw new Error('revoked');
      },
    } as never);

    await expect(service.refresh(integration() as never, 'publish')).resolves.toBe(false);

    // All three matter: without the flag the channel looks healthy, without the
    // notification the user never learns, without the disconnect the workflow
    // keeps retrying with a dead token.
    expect(integrationService.refreshNeeded).toHaveBeenCalledWith('org', 'i1');
    expect(integrationService.informAboutRefreshError).toHaveBeenCalledWith(
      'org',
      expect.objectContaining({ id: 'i1' }),
      'publish'
    );
    expect(integrationService.disconnectChannel).toHaveBeenCalledOnce();
    expect(integrationService.createOrUpdateIntegration).not.toHaveBeenCalled();
  });

  it('treats a refresh that came back without an access token as a failure', async () => {
    const { service, integrationManager, integrationService } = build();
    integrationManager.getSocialIntegration.mockReturnValue({
      refreshToken: async () => tokens({ accessToken: '' }),
    } as never);

    // This is the LinkedIn shape: the call resolves, but with nothing usable.
    await expect(service.refresh(integration() as never)).resolves.toBe(false);
    expect(integrationService.disconnectChannel).toHaveBeenCalledOnce();
  });

  it('does not re-connect a channel that was never migrated', async () => {
    const { service, integrationManager } = build();
    const reConnect = vi.fn();
    integrationManager.getSocialIntegration.mockReturnValue({
      refreshToken: async () => tokens(),
      reConnect,
    } as never);

    await service.refresh(integration() as never);

    expect(reConnect).not.toHaveBeenCalled();
  });

  it('re-resolves a migrated channel through the provider reConnect', async () => {
    const { service, integrationManager, integrationService } = build();
    const reConnect = vi.fn(async () => ({
      id: 'page-2',
      name: 'The Page',
      accessToken: 'page-token',
      picture: 'https://page.test',
      username: 'page',
    }));
    integrationManager.getSocialIntegration.mockReturnValue({
      refreshToken: async () => tokens(),
      reConnect,
    } as never);

    const result = await service.refresh(
      integration({ rootInternalId: 'user-1', internalId: 'page-1' }) as never
    );

    // A page token is not the user token: publishing with the wrong one fails
    // for every post on that channel.
    expect(reConnect).toHaveBeenCalledWith('user-1', 'page-1', 'fresh');
    expect(result).toMatchObject({ accessToken: 'page-token', refreshToken: 'next' });
  });

  it('passes the one-time-token flag through to the upsert', async () => {
    const { service, integrationManager, integrationService } = build();
    integrationManager.getSocialIntegration.mockReturnValue({
      oneTimeToken: true,
      refreshToken: async () => tokens(),
    } as never);

    await service.refresh(integration() as never);

    expect(integrationService.createOrUpdateIntegration.mock.calls[0][1]).toBe(true);
  });
});

describe('RefreshIntegrationService.setBetweenSteps', () => {
  it('flags the channel and notifies the user', async () => {
    const { service, integrationService } = build();

    await service.setBetweenSteps(integration() as never, 'scopes changed');

    expect(integrationService.setBetweenRefreshSteps).toHaveBeenCalledWith('i1');
    expect(integrationService.informAboutRefreshError).toHaveBeenCalledWith(
      'org',
      expect.objectContaining({ id: 'i1' }),
      'scopes changed'
    );
  });
});

describe('RefreshIntegrationService.startRefreshWorkflow', () => {
  it('does nothing for a provider with no refresh schedule', async () => {
    const { service, temporalService } = build();

    await expect(
      service.startRefreshWorkflow('org', 'i1', { refreshCron: undefined } as never)
    ).resolves.toBe(false);
    expect(temporalService.client.getRawClient).not.toHaveBeenCalled();
  });

  it('starts one workflow per channel, replacing any earlier run', async () => {
    const { service, temporalService } = build();
    const start = vi.fn(async (..._args: any[]) => ({}));
    temporalService.client.getRawClient.mockReturnValue({ workflow: { start } } as never);

    await service.startRefreshWorkflow('org', 'i1', { refreshCron: '0 0 * * *' } as never);

    // A per-channel workflow id is what stops two refresh loops racing on the
    // same channel and invalidating each other's token.
    expect(start).toHaveBeenCalledWith(
      'refreshTokenWorkflow',
      expect.objectContaining({
        workflowId: 'refresh_i1',
        taskQueue: 'main',
        workflowIdConflictPolicy: 'TERMINATE_EXISTING',
        args: [{ integrationId: 'i1', organizationId: 'org' }],
      })
    );
  });
});
