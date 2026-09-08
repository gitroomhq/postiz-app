import { IntegrationService } from './integration.service';
import { NotEnoughScopes } from '@gitroom/nestjs-libraries/integrations/social.abstract';

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
