import { IntegrationService } from './integration.service';
import {
  NotEnoughScopes,
  RefreshToken,
} from '@gitroom/nestjs-libraries/integrations/social.abstract';

const mocks = () => ({
  integrationRepository: {
    getIntegrationById: vi.fn(),
    getIntegrationByInternalId: vi.fn(),
    getIntegrationsList: vi.fn(async () => []),
    createOrUpdateIntegration: vi.fn(async (...args: any[]) => ({ id: 'i1' })),
    migrateIntegration: vi.fn(async (...args: any[]) => ({ id: 'i1' })),
    disconnectChannel: vi.fn(),
    needsToBeRefreshed: vi.fn(async () => []),
    refreshNeeded: vi.fn(),
    enableChannel: vi.fn(async () => ({ id: 'i1' })),
    getPlug: vi.fn(),
    updateIntegration: vi.fn(async (..._args: any[]) => ({})),
    checkForDeletedOnceAndUpdate: vi.fn(),
    getPostingTimes: vi.fn(async () => []),
    loadExisingData: vi.fn(async () => []),
    createOrUpdatePlug: vi.fn(async () => ({ activated: true })),
    changePlugActivation: vi.fn(async () => ({ id: 'plug-1' })),
  },
  autopostsRepository: { getAutoposts: vi.fn(async () => []) },
  integrationManager: {
    getSocialIntegration: vi.fn(),
    getMigrationTarget: vi.fn(),
    getMigrationSources: vi.fn(() => []),
    getInternalPlugs: vi.fn(() => ({ internalPlugs: [] })),
  },
  notificationService: { inAppNotification: vi.fn() },
  refreshIntegrationService: { refresh: vi.fn() },
  temporalService: { terminateWorkflow: vi.fn() },
});

const build = () => {
  const m = mocks();
  const service = new IntegrationService(
    m.integrationRepository as never,
    m.autopostsRepository as never,
    m.integrationManager as never,
    m.notificationService as never,
    m.refreshIntegrationService as never,
    m.temporalService as never
  );

  return { service, ...m };
};

describe('IntegrationService.refreshToken', () => {
  it('returns the three fields the caller needs', async () => {
    const { service } = build();
    const provider = {
      refreshToken: async () => ({ refreshToken: 'r', accessToken: 'a', expiresIn: 100 }),
    };

    await expect(service.refreshToken(provider as never, 'old')).resolves.toEqual({
      refreshToken: 'r',
      accessToken: 'a',
      expiresIn: 100,
    });
  });

  it.each([
    ['no access token', { refreshToken: 'r', accessToken: '', expiresIn: 100 }],
    ['no refresh token', { refreshToken: '', accessToken: 'a', expiresIn: 100 }],
    ['no expiry', { refreshToken: 'r', accessToken: 'a', expiresIn: 0 }],
  ])('reports failure when the provider returns %s', async (_label, response) => {
    const { service } = build();

    // A half-populated refresh must not be stored: the workflow would retry
    // the publish with a token that cannot work.
    await expect(
      service.refreshToken({ refreshToken: async () => response } as never, 'old')
    ).resolves.toBe(false);
  });

  it('reports failure when the provider throws', async () => {
    const { service } = build();

    await expect(
      service.refreshToken(
        {
          refreshToken: async () => {
            throw new Error('revoked');
          },
        } as never,
        'old'
      )
    ).resolves.toBe(false);
  });
});

describe('IntegrationService.refreshTokens', () => {
  const integration = {
    id: 'i1',
    organizationId: 'org',
    name: 'My channel',
    internalId: 'ext-1',
    providerIdentifier: 'mastodon',
    refreshToken: 'old-refresh',
  };

  it('stores the new tokens for a channel it could refresh', async () => {
    const { service, integrationRepository, integrationManager } = build();
    integrationRepository.needsToBeRefreshed.mockResolvedValue([integration] as never);
    integrationManager.getSocialIntegration.mockReturnValue({
      oneTimeToken: false,
      refreshToken: async () => ({ refreshToken: 'r2', accessToken: 'a2', expiresIn: 200 }),
    } as never);

    await service.refreshTokens();

    expect(integrationRepository.createOrUpdateIntegration).toHaveBeenCalledWith(
      undefined,
      false,
      'org',
      'My channel',
      undefined,
      'social',
      'ext-1',
      'mastodon',
      'a2',
      'r2',
      200,
      undefined, // username
      false, // isBetweenSteps
      undefined, // refresh
      undefined, // timezone
      undefined // customInstanceDetails
    );
  });

  it('notifies the user and flags the channel when the refresh fails', async () => {
    const { service, integrationRepository, integrationManager, notificationService } = build();
    integrationRepository.needsToBeRefreshed.mockResolvedValue([integration] as never);
    integrationManager.getSocialIntegration.mockReturnValue({
      refreshToken: async () => {
        throw new Error('revoked');
      },
    } as never);

    await service.refreshTokens();

    // Silently dropping this is how a channel stops publishing with nothing in
    // the UI to explain why.
    expect(notificationService.inAppNotification).toHaveBeenCalledOnce();
    expect(integrationRepository.refreshNeeded).toHaveBeenCalledWith('org', 'i1');
    expect(integrationRepository.createOrUpdateIntegration).not.toHaveBeenCalled();
  });
});

describe('IntegrationService.disconnectChannel', () => {
  it('disconnects and tells the user which provider needs reconnecting', async () => {
    const { service, integrationRepository, notificationService } = build();

    await service.disconnectChannel(
      'org',
      { id: 'i1', providerIdentifier: 'linkedin' } as never,
      'token expired'
    );

    expect(integrationRepository.disconnectChannel).toHaveBeenCalledWith('org', 'i1');
    const [orgId, title, body] = notificationService.inAppNotification.mock.calls[0];
    expect(orgId).toBe('org');
    expect(title).toContain('linkedin');
    expect(body).toContain('token expired');
  });
});

describe('IntegrationService.enableChannel', () => {
  it('enables the channel when billing is not configured', async () => {
    const { service, integrationRepository } = build();
    integrationRepository.getIntegrationsList.mockResolvedValue([
      { id: 'a', disabled: false },
      { id: 'b', disabled: false },
    ] as never);

    await expect(service.enableChannel('org', 1, 'i1')).resolves.toEqual({ id: 'i1' });
  });

  it('refuses past the plan limit once billing is configured', async () => {
    const { service, integrationRepository } = build();
    vi.stubEnv('STRIPE_PUBLISHABLE_KEY', 'pk_test');
    integrationRepository.getIntegrationsList.mockResolvedValue([
      { id: 'a', disabled: false },
      { id: 'b', disabled: false },
    ] as never);

    await expect(service.enableChannel('org', 2, 'i1')).rejects.toThrow(
      'You have reached the maximum number of channels'
    );
  });

  it('does not count already disabled channels against the limit', async () => {
    const { service, integrationRepository } = build();
    vi.stubEnv('STRIPE_PUBLISHABLE_KEY', 'pk_test');
    integrationRepository.getIntegrationsList.mockResolvedValue([
      { id: 'a', disabled: false },
      { id: 'b', disabled: true },
    ] as never);

    await expect(service.enableChannel('org', 2, 'i1')).resolves.toEqual({ id: 'i1' });
  });
});

describe('IntegrationService.migrateIntegration', () => {
  const existing = {
    id: 'i1',
    providerIdentifier: 'instagram',
    internalId: 'old-ext',
    rootInternalId: 'old-ext',
    profile: 'me',
  };

  const auth = { id: 'new-ext', username: 'me' };

  it('refuses when the channel to migrate does not exist', async () => {
    const { service, integrationRepository } = build();
    integrationRepository.getIntegrationByInternalId.mockResolvedValue(null);

    await expect(
      service.migrateIntegration('org', 'old-ext', 'instagram-standalone', auth)
    ).rejects.toThrow(NotEnoughScopes);
  });

  it('refuses when the new provider is not the configured migration target', async () => {
    const { service, integrationRepository, integrationManager } = build();
    integrationRepository.getIntegrationByInternalId.mockResolvedValue(existing as never);
    integrationManager.getMigrationTarget.mockReturnValue('something-else');

    await expect(
      service.migrateIntegration('org', 'old-ext', 'instagram-standalone', auth)
    ).rejects.toThrow(/needs to be refreshed/);
  });

  it('refuses when the user connected a different account', async () => {
    const { service, integrationRepository, integrationManager } = build();
    integrationRepository.getIntegrationByInternalId.mockResolvedValue(existing as never);
    integrationManager.getMigrationTarget.mockReturnValue('instagram-standalone');
    integrationManager.getSocialIntegration.mockReturnValue({
      migrationMatch: () => false,
    } as never);

    // Migrating in place onto someone else's account would hand their scheduled
    // posts to the wrong profile.
    await expect(
      service.migrateIntegration('org', 'old-ext', 'instagram-standalone', auth)
    ).rejects.toThrow(/connect the same account \(@me\)/);
  });

  it('refuses when the target account is already a separate channel', async () => {
    const { service, integrationRepository, integrationManager } = build();
    integrationRepository.getIntegrationByInternalId
      .mockResolvedValueOnce(existing as never)
      .mockResolvedValueOnce({ id: 'i2' } as never);
    integrationManager.getMigrationTarget.mockReturnValue('instagram-standalone');
    integrationManager.getSocialIntegration.mockReturnValue({
      migrationMatch: () => true,
    } as never);

    await expect(
      service.migrateIntegration('org', 'old-ext', 'instagram-standalone', auth)
    ).rejects.toThrow(/already connected as another channel/);
  });

  it('moves the channel in place, adopting the new external id as the root', async () => {
    const { service, integrationRepository, integrationManager } = build();
    integrationRepository.getIntegrationByInternalId
      .mockResolvedValueOnce(existing as never)
      .mockResolvedValueOnce(null);
    integrationManager.getMigrationTarget.mockReturnValue('instagram-standalone');
    integrationManager.getSocialIntegration.mockReturnValue({
      migrationMatch: () => true,
    } as never);

    await service.migrateIntegration('org', 'old-ext', 'instagram-standalone', auth);

    expect(integrationRepository.migrateIntegration).toHaveBeenCalledWith(
      'org',
      'i1',
      'new-ext',
      'instagram-standalone',
      'new-ext'
    );
  });

  it('keeps an existing root id when the channel was already migrated once', async () => {
    const { service, integrationRepository, integrationManager } = build();
    integrationRepository.getIntegrationByInternalId
      .mockResolvedValueOnce({ ...existing, rootInternalId: 'original-ext' } as never)
      .mockResolvedValueOnce(null);
    integrationManager.getMigrationTarget.mockReturnValue('instagram-standalone');
    integrationManager.getSocialIntegration.mockReturnValue({
      migrationMatch: () => true,
    } as never);

    await service.migrateIntegration('org', 'old-ext', 'instagram-standalone', auth);

    expect(integrationRepository.migrateIntegration.mock.calls[0][4]).toBe('original-ext');
  });
});

describe('IntegrationService.migrateIntegrationOnConnect', () => {
  const auth = { id: 'new-ext', username: 'me' };

  it('does nothing for a provider that is not a migration target', async () => {
    const { service, integrationRepository } = build();

    await expect(
      service.migrateIntegrationOnConnect('org', 'mastodon', auth)
    ).resolves.toBeUndefined();
    expect(integrationRepository.migrateIntegration).not.toHaveBeenCalled();
  });

  it('does nothing while the provider is mid multi-step connect', async () => {
    const { service, integrationRepository, integrationManager } = build();
    integrationManager.getMigrationSources.mockReturnValue(['instagram']);
    integrationManager.getSocialIntegration.mockReturnValue({ isBetweenSteps: true } as never);

    await service.migrateIntegrationOnConnect('org', 'instagram-standalone', auth);

    expect(integrationRepository.migrateIntegration).not.toHaveBeenCalled();
  });

  it('leaves the normal upsert to handle an account already on the new provider', async () => {
    const { service, integrationRepository, integrationManager } = build();
    integrationManager.getMigrationSources.mockReturnValue(['instagram']);
    integrationManager.getSocialIntegration.mockReturnValue({ isBetweenSteps: false } as never);
    integrationRepository.getIntegrationByInternalId.mockResolvedValue({ id: 'i9' } as never);

    await service.migrateIntegrationOnConnect('org', 'instagram-standalone', auth);

    expect(integrationRepository.migrateIntegration).not.toHaveBeenCalled();
  });

  it('creates a new channel when no source channel matches the account', async () => {
    const { service, integrationRepository, integrationManager } = build();
    integrationManager.getMigrationSources.mockReturnValue(['instagram']);
    integrationManager.getSocialIntegration.mockReturnValue({
      isBetweenSteps: false,
      migrationMatch: () => false,
    } as never);
    integrationRepository.getIntegrationByInternalId.mockResolvedValue(null);
    integrationRepository.getIntegrationsList.mockResolvedValue([
      { id: 'i1', providerIdentifier: 'instagram' },
    ] as never);

    await service.migrateIntegrationOnConnect('org', 'instagram-standalone', auth);

    expect(integrationRepository.migrateIntegration).not.toHaveBeenCalled();
  });

  it('adopts the matching source channel instead of creating a duplicate', async () => {
    const { service, integrationRepository, integrationManager } = build();
    integrationManager.getMigrationSources.mockReturnValue(['instagram']);
    integrationManager.getSocialIntegration.mockReturnValue({
      isBetweenSteps: false,
      migrationMatch: () => true,
    } as never);
    integrationRepository.getIntegrationByInternalId.mockResolvedValue(null);
    integrationRepository.getIntegrationsList.mockResolvedValue([
      { id: 'i1', providerIdentifier: 'instagram', internalId: 'old', rootInternalId: 'old' },
    ] as never);

    await service.migrateIntegrationOnConnect('org', 'instagram-standalone', auth);

    // Otherwise the user ends up with the same account twice and no idea which
    // one their scheduled posts belong to.
    expect(integrationRepository.migrateIntegration).toHaveBeenCalledWith(
      'org',
      'i1',
      'new-ext',
      'instagram-standalone',
      'new-ext'
    );
  });

  it('ignores a channel on a provider that is not a migration source', async () => {
    const { service, integrationRepository, integrationManager } = build();
    integrationManager.getMigrationSources.mockReturnValue(['instagram']);
    integrationManager.getSocialIntegration.mockReturnValue({
      isBetweenSteps: false,
      migrationMatch: () => true,
    } as never);
    integrationRepository.getIntegrationByInternalId.mockResolvedValue(null);
    integrationRepository.getIntegrationsList.mockResolvedValue([
      { id: 'i1', providerIdentifier: 'mastodon' },
    ] as never);

    await service.migrateIntegrationOnConnect('org', 'instagram-standalone', auth);

    expect(integrationRepository.migrateIntegration).not.toHaveBeenCalled();
  });
});

describe('IntegrationService.createOrUpdateIntegration', () => {
  const call = (service: IntegrationService, picture?: string) =>
    service.createOrUpdateIntegration(
      undefined,
      false,
      'org',
      'My channel',
      picture,
      'social',
      'ext-1',
      'mastodon',
      'token'
    );

  it('passes an already hosted picture through untouched', async () => {
    const { service, integrationRepository } = build();

    await call(service, 'https://imagedelivery.net/abc/public');

    expect(integrationRepository.createOrUpdateIntegration.mock.calls[0][4]).toBe(
      'https://imagedelivery.net/abc/public'
    );
  });

  it('mirrors a remote picture into storage', async () => {
    const { service, integrationRepository } = build();
    const uploadSimple = vi.fn(async () => 'https://cdn.test/copy.png');
    (service as never as { storage: unknown }).storage = { uploadSimple };

    await call(service, 'https://remote.test/avatar.png');

    expect(uploadSimple).toHaveBeenCalledWith('https://remote.test/avatar.png');
    expect(integrationRepository.createOrUpdateIntegration.mock.calls[0][4]).toBe(
      'https://cdn.test/copy.png'
    );
  });

  it('still connects the channel when the picture upload fails', async () => {
    const { service, integrationRepository } = build();
    (service as never as { storage: unknown }).storage = {
      uploadSimple: vi.fn(async () => {
        throw new Error('storage down');
      }),
    };

    // Losing an avatar must never cost the user the connection itself.
    await expect(call(service, 'https://remote.test/avatar.png')).resolves.toEqual({ id: 'i1' });
    expect(integrationRepository.createOrUpdateIntegration.mock.calls[0][4]).toBeUndefined();
  });

  it('does not touch storage when there is no picture', async () => {
    const { service, integrationRepository } = build();
    const uploadSimple = vi.fn();
    (service as never as { storage: unknown }).storage = { uploadSimple };

    await call(service);

    expect(uploadSimple).not.toHaveBeenCalled();
    expect(integrationRepository.createOrUpdateIntegration.mock.calls[0][4]).toBeUndefined();
  });
});

describe('IntegrationService.changeActiveCron', () => {
  it('terminates only the active autopost workflows', async () => {
    const { service, autopostsRepository, temporalService } = build();
    autopostsRepository.getAutoposts.mockResolvedValue([
      { id: 'a1', active: true },
      { id: 'a2', active: false },
    ] as never);

    await expect(service.changeActiveCron('org')).resolves.toBe(true);

    expect(temporalService.terminateWorkflow).toHaveBeenCalledOnce();
    expect(temporalService.terminateWorkflow).toHaveBeenCalledWith('autopost-a1');
  });

  it('keeps going when one workflow cannot be terminated', async () => {
    const { service, autopostsRepository, temporalService } = build();
    autopostsRepository.getAutoposts.mockResolvedValue([
      { id: 'a1', active: true },
      { id: 'a2', active: true },
    ] as never);
    temporalService.terminateWorkflow.mockRejectedValueOnce(new Error('already gone'));

    await expect(service.changeActiveCron('org')).resolves.toBe(true);
    expect(temporalService.terminateWorkflow).toHaveBeenCalledTimes(2);
  });
});

describe('IntegrationService.processInternalPlug', () => {
  const data = {
    post: 'p1',
    originalIntegration: 'i1',
    integration: 'i2',
    plugName: 'repost',
    orgId: 'org',
    delay: 0,
    information: { name: 'repost' },
  };

  it('does nothing when either side of the plug is gone', async () => {
    const { service, integrationRepository, integrationManager } = build();
    integrationRepository.getIntegrationById
      .mockResolvedValueOnce({ id: 'i1' } as never)
      .mockResolvedValueOnce(null);

    await expect(service.processInternalPlug(data)).resolves.toBeUndefined();
    expect(integrationManager.getInternalPlugs).not.toHaveBeenCalled();
  });

  it('does nothing when the provider does not declare that plug', async () => {
    const { service, integrationRepository, integrationManager } = build();
    integrationRepository.getIntegrationById.mockResolvedValue({
      id: 'i',
      providerIdentifier: 'mastodon',
    } as never);
    integrationManager.getInternalPlugs.mockReturnValue({
      internalPlugs: [{ identifier: 'other', methodName: 'other' }],
    } as never);

    await expect(service.processInternalPlug(data)).resolves.toBeUndefined();
    expect(integrationManager.getSocialIntegration).not.toHaveBeenCalled();
  });

  it('calls the declared provider method with both channels', async () => {
    const { service, integrationRepository, integrationManager } = build();
    const target = { id: 'i2', providerIdentifier: 'mastodon' };
    const original = { id: 'i1', providerIdentifier: 'mastodon' };
    integrationRepository.getIntegrationById
      .mockResolvedValueOnce(original as never)
      .mockResolvedValueOnce(target as never);
    integrationManager.getInternalPlugs.mockReturnValue({
      internalPlugs: [{ identifier: 'repost', methodName: 'repostPost' }],
    } as never);
    const repostPost = vi.fn();
    integrationManager.getSocialIntegration.mockReturnValue({ repostPost } as never);

    await service.processInternalPlug(data);

    expect(repostPost).toHaveBeenCalledWith(target, original, 'p1', data.information);
  });
});

describe('IntegrationService.processPlugs', () => {
  it('reports done for a plug that no longer exists', async () => {
    const { service, integrationRepository } = build();
    integrationRepository.getPlug.mockResolvedValue(null);

    await expect(
      service.processPlugs({ plugId: 'x', postId: 'p1', delay: 0, totalRuns: 1, currentRun: 1 })
    ).resolves.toBe(true);
  });
});

describe('IntegrationService.saveProviderPage', () => {
  const inBetween = {
    id: 'i1',
    providerIdentifier: 'facebook',
    inBetweenSteps: true,
    token: 'user-token',
  };

  it('refuses a channel that does not exist', async () => {
    const { service, integrationRepository } = build();
    integrationRepository.getIntegrationById.mockResolvedValue(null);

    await expect(service.saveProviderPage('org', 'i1', {})).rejects.toThrow(
      'Integration not found'
    );
  });

  it('refuses a channel that is not waiting on a page choice', async () => {
    const { service, integrationRepository } = build();
    integrationRepository.getIntegrationById.mockResolvedValue({
      ...inBetween,
      inBetweenSteps: false,
    } as never);

    await expect(service.saveProviderPage('org', 'i1', {})).rejects.toThrow('Invalid request');
  });

  it('refuses a provider that has no page selection', async () => {
    const { service, integrationRepository, integrationManager } = build();
    integrationRepository.getIntegrationById.mockResolvedValue(inBetween as never);
    integrationManager.getSocialIntegration.mockReturnValue({} as never);

    await expect(service.saveProviderPage('org', 'i1', {})).rejects.toThrow(
      'Provider does not support page selection'
    );
  });

  it('swaps the channel over to the chosen page and its own token', async () => {
    const { service, integrationRepository, integrationManager } = build();
    integrationRepository.getIntegrationById.mockResolvedValue(inBetween as never);
    integrationRepository.updateIntegration.mockResolvedValue({} as never);
    integrationRepository.checkForDeletedOnceAndUpdate = vi.fn() as never;
    integrationManager.getSocialIntegration.mockReturnValue({
      fetchPageInformation: async () => ({
        id: 'page-1',
        name: 'The Page',
        picture: 'https://pic.test',
        access_token: 'page-token',
        username: 'thepage',
      }),
    } as never);

    await expect(service.saveProviderPage('org', 'i1', { page: 'page-1' })).resolves.toEqual({
      success: true,
    });

    // Keeping the user token here is what makes every later publish fail with
    // a permissions error the user cannot act on.
    expect(integrationRepository.updateIntegration).toHaveBeenCalledWith('i1', {
      picture: 'https://pic.test',
      internalId: 'page-1',
      organizationId: 'org',
      name: 'The Page',
      inBetweenSteps: false,
      token: 'page-token',
      profile: 'thepage',
    });
  });
});

describe('IntegrationService.checkAnalytics', () => {
  const org = { id: 'org' } as never;
  const social = {
    id: 'i1',
    type: 'social',
    internalId: 'ext-1',
    token: 'token',
    providerIdentifier: 'mastodon',
    tokenExpiration: new Date(Date.now() + 86_400_000),
  };

  it('refuses an unknown channel', async () => {
    const { service, integrationRepository } = build();
    integrationRepository.getIntegrationById.mockResolvedValue(null);

    await expect(service.checkAnalytics(org, 'i1', '7')).rejects.toThrow('Invalid integration');
  });

  it('returns nothing for a non-social channel', async () => {
    const { service, integrationRepository } = build();
    integrationRepository.getIntegrationById.mockResolvedValue({
      ...social,
      type: 'article',
    } as never);

    await expect(service.checkAnalytics(org, 'i1', '7')).resolves.toEqual([]);
  });

  it('returns nothing for a provider with no analytics', async () => {
    const { service, integrationRepository, integrationManager } = build();
    integrationRepository.getIntegrationById.mockResolvedValue(social as never);
    integrationManager.getSocialIntegration.mockReturnValue({} as never);

    await expect(service.checkAnalytics(org, 'i1', '7')).resolves.toEqual([]);
  });

  it('asks the provider and caches the answer', async () => {
    const { service, integrationRepository, integrationManager } = build();
    integrationRepository.getIntegrationById.mockResolvedValue(social as never);
    const analytics = vi.fn(async () => [{ label: 'Followers', percentageChange: 0, data: [] }]);
    integrationManager.getSocialIntegration.mockReturnValue({ analytics } as never);

    await expect(service.checkAnalytics(org, 'i1', '7')).resolves.toHaveLength(1);
    expect(analytics).toHaveBeenCalledWith('ext-1', 'token', 7);

    // The second read is served from the cache, so the rate-limited provider
    // is not asked again for the same window.
    await expect(service.checkAnalytics(org, 'i1', '7')).resolves.toHaveLength(1);
    expect(analytics).toHaveBeenCalledOnce();
  });

  it('refreshes an expired token before asking', async () => {
    const { service, integrationRepository, integrationManager, refreshIntegrationService } =
      build();
    integrationRepository.getIntegrationById.mockResolvedValue({
      ...social,
      tokenExpiration: new Date(Date.now() - 1000),
    } as never);
    refreshIntegrationService.refresh.mockResolvedValue({ accessToken: 'fresh' } as never);
    const analytics = vi.fn(async () => []);
    integrationManager.getSocialIntegration.mockReturnValue({ analytics } as never);

    await service.checkAnalytics(org, 'i1', '30');

    expect(analytics).toHaveBeenCalledWith('ext-1', 'fresh', 30);
  });

  it('returns nothing when the refresh itself fails', async () => {
    const { service, integrationRepository, integrationManager, refreshIntegrationService } =
      build();
    integrationRepository.getIntegrationById.mockResolvedValue({
      ...social,
      tokenExpiration: new Date(Date.now() - 1000),
    } as never);
    refreshIntegrationService.refresh.mockResolvedValue(false as never);
    integrationManager.getSocialIntegration.mockReturnValue({ analytics: vi.fn() } as never);

    await expect(service.checkAnalytics(org, 'i1', '7')).resolves.toEqual([]);
  });

  it('disconnects the channel when the refresh returns no token', async () => {
    const { service, integrationRepository, integrationManager, refreshIntegrationService } =
      build();
    integrationRepository.getIntegrationById.mockResolvedValue({
      ...social,
      tokenExpiration: new Date(Date.now() - 1000),
    } as never);
    refreshIntegrationService.refresh.mockResolvedValue({ accessToken: '' } as never);
    integrationManager.getSocialIntegration.mockReturnValue({ analytics: vi.fn() } as never);

    await expect(service.checkAnalytics(org, 'i1', '7')).resolves.toEqual([]);
    expect(integrationRepository.disconnectChannel).toHaveBeenCalledOnce();
  });

  it('retries once with a forced refresh when the provider says the token expired', async () => {
    const { service, integrationRepository, integrationManager, refreshIntegrationService } =
      build();
    integrationRepository.getIntegrationById.mockResolvedValue(social as never);
    refreshIntegrationService.refresh.mockResolvedValue({ accessToken: 'fresh' } as never);
    const analytics = vi
      .fn()
      .mockRejectedValueOnce(new RefreshToken('mastodon', 'expired', '{}'))
      .mockResolvedValueOnce([{ label: 'Followers', percentageChange: 0, data: [] }]);
    integrationManager.getSocialIntegration.mockReturnValue({ analytics } as never);

    await expect(service.checkAnalytics(org, 'i1', '90')).resolves.toHaveLength(1);
    expect(analytics).toHaveBeenCalledTimes(2);
  });
});

describe('IntegrationService.processPlugs', () => {
  const plug = (over: Record<string, unknown> = {}) => ({
    id: 'plug-1',
    plugFunction: 'repostPost',
    data: '[{"name":"delay","value":60}]',
    integration: { id: 'i1', providerIdentifier: 'mastodon' },
    ...over,
  });

  it('flattens the stored plug fields into the arguments the provider expects', async () => {
    const { service, integrationRepository, integrationManager } = build();
    integrationRepository.getPlug.mockResolvedValue(plug() as never);
    const repostPost = vi.fn(async () => true);
    integrationManager.getSocialIntegration.mockReturnValue({ repostPost } as never);

    await service.processPlugs({
      plugId: 'plug-1',
      postId: 'p1',
      delay: 0,
      totalRuns: 3,
      currentRun: 1,
    });

    expect(repostPost).toHaveBeenCalledWith(plug().integration, 'p1', { delay: 60 });
  });

  it('reports done when the provider says the plug finished', async () => {
    const { service, integrationRepository, integrationManager } = build();
    integrationRepository.getPlug.mockResolvedValue(plug() as never);
    integrationManager.getSocialIntegration.mockReturnValue({
      repostPost: async () => true,
    } as never);

    await expect(
      service.processPlugs({ plugId: 'plug-1', postId: 'p1', delay: 0, totalRuns: 3, currentRun: 1 })
    ).resolves.toBe(true);
  });

  it('asks to be run again while runs remain', async () => {
    const { service, integrationRepository, integrationManager } = build();
    integrationRepository.getPlug.mockResolvedValue(plug() as never);
    integrationManager.getSocialIntegration.mockReturnValue({
      repostPost: async () => false,
    } as never);

    await expect(
      service.processPlugs({ plugId: 'plug-1', postId: 'p1', delay: 0, totalRuns: 3, currentRun: 1 })
    ).resolves.toBe(false);
  });

  it('stops on the last run even if the provider did not finish', async () => {
    const { service, integrationRepository, integrationManager } = build();
    integrationRepository.getPlug.mockResolvedValue(plug() as never);
    integrationManager.getSocialIntegration.mockReturnValue({
      repostPost: async () => false,
    } as never);

    await expect(
      service.processPlugs({ plugId: 'plug-1', postId: 'p1', delay: 0, totalRuns: 3, currentRun: 3 })
    ).resolves.toBe(true);
  });
});

describe('IntegrationService.findFreeDateTime', () => {
  it('merges the posting times of every channel, without duplicates', async () => {
    const { service, integrationRepository } = build();
    integrationRepository.getPostingTimes.mockResolvedValue([
      { postingTimes: '[{"time":540},{"time":720}]' },
      { postingTimes: '[{"time":720},{"time":1080}]' },
    ] as never);

    await expect(service.findFreeDateTime('org')).resolves.toEqual([540, 720, 1080]);
  });

  it('returns nothing when no channel has posting times', async () => {
    const { service, integrationRepository } = build();
    integrationRepository.getPostingTimes.mockResolvedValue([] as never);

    await expect(service.findFreeDateTime('org')).resolves.toEqual([]);
  });
});

describe('IntegrationService.loadExisingData', () => {
  it('returns only the ids that were not stored before', async () => {
    const { service, integrationRepository } = build();
    integrationRepository.loadExisingData.mockResolvedValue([
      { value: 'a' },
      { value: 'c' },
    ] as never);

    // Re-running a plug over an id it already handled is how a follower gets
    // messaged twice.
    await expect(
      service.loadExisingData('repostPost', 'i1', ['a', 'b', 'c', 'd'])
    ).resolves.toEqual(['b', 'd']);
  });
});

describe('IntegrationService plug management', () => {
  it('reports the activation state back to the caller', async () => {
    const { service, integrationRepository } = build();
    integrationRepository.createOrUpdatePlug.mockResolvedValue({ activated: true } as never);

    await expect(
      service.createOrUpdatePlug('org', 'i1', { func: 'repostPost', fields: [] } as never)
    ).resolves.toEqual({ activated: true });
  });

  it('returns the plug id after an activation change', async () => {
    const { service, integrationRepository } = build();
    integrationRepository.changePlugActivation.mockResolvedValue({
      id: 'plug-1',
      integrationId: 'i1',
      plugFunction: 'repostPost',
    } as never);

    await expect(service.changePlugActivation('org', 'plug-1', false)).resolves.toEqual({
      id: 'plug-1',
    });
  });
});

describe('IntegrationService thin repository delegates', () => {
  it.each([
    ['getMentions', ['mastodon', 'q'], 'getMentions'],
    ['insertMentions', ['mastodon', []], 'insertMentions'],
    ['setTimes', ['org', 'i1', {}], 'setTimes'],
    ['updateProviderSettings', ['org', 'i1', '[]'], 'updateProviderSettings'],
    ['checkPreviousConnections', ['org', 'i1'], 'checkPreviousConnections'],
    ['updateIntegrationGroup', ['org', 'i1', 'g'], 'updateIntegrationGroup'],
    ['updateOnCustomerName', ['org', 'i1', 'name'], 'updateOnCustomerName'],
    ['getIntegrationsList', ['org'], 'getIntegrationsList'],
    ['getIntegrationForOrder', ['i1', 'o1', 'u1', 'org'], 'getIntegrationForOrder'],
    ['updateNameAndUrl', ['i1', 'n', 'u'], 'updateNameAndUrl'],
    ['getIntegrationById', ['org', 'i1'], 'getIntegrationById'],
    ['refreshNeeded', ['org', 'i1'], 'refreshNeeded'],
    ['setBetweenRefreshSteps', ['i1'], 'setBetweenRefreshSteps'],
    ['disableChannel', ['org', 'i1'], 'disableChannel'],
    ['getPostsForChannel', ['org', 'i1'], 'getPostsForChannel'],
    ['deleteChannel', ['org', 'i1'], 'deleteChannel'],
    ['disableIntegrations', ['org', 2], 'disableIntegrations'],
    ['checkForDeletedOnceAndUpdate', ['org', 'p'], 'checkForDeletedOnceAndUpdate'],
    ['customers', ['org'], 'customers'],
    ['getPlugsByIntegrationId', ['org', 'i1'], 'getPlugsByIntegrationId'],
    ['getPlugs', ['org', 'i1'], 'getPlugs'],
  ])('%s reaches the repository', async (method, args, repoMethod) => {
    const { service, integrationRepository } = build();
    (integrationRepository as Record<string, unknown>)[repoMethod] = vi.fn(async () => 'ok');

    await expect((service as any)[method](...args)).resolves.toBe('ok');
  });
});
