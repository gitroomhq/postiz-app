import dayjs from 'dayjs';

import { SubscriptionService } from './subscription.service';

type Mocks = ReturnType<typeof mocks>;

const mocks = () => ({
  subscriptionRepository: {
    getSubscriptionByOrganizationId: vi.fn(),
    useCredit: vi.fn(async (_org: any, _type: string, cb: () => any) => cb()),
    getCode: vi.fn(),
    getSubscriptionByCustomerId: vi.fn(async () => null as any),
    getSubscriptionByOrgId: vi.fn(async () => null as any),
    getOrganizationByCustomerId: vi.fn(async () => ({ id: 'org-1' } as any)),
    deleteSubscriptionByCustomerId: vi.fn(async () => ({ count: 1 })),
    deleteSubscriptionByOrgId: vi.fn(async () => ({ count: 1 })),
    updateCustomerId: vi.fn(),
    checkSubscription: vi.fn(),
    createOrUpdateSubscription: vi.fn(async () => ({ id: 'sub-1' })),
    getSubscriptionByIdentifier: vi.fn(),
    getSubscription: vi.fn(),
    getCreditsFrom: vi.fn(
      async (_org: string, _from: dayjs.Dayjs, _type: string) => 0
    ),
    setCustomerId: vi.fn(),
  },
  integrationService: {
    getIntegrationsList: vi.fn(async () => [] as any[]),
    disableIntegrations: vi.fn(),
    changeActiveCron: vi.fn(),
  },
  organizationService: {
    disableOrEnableNonSuperAdminUsers: vi.fn(),
  },
});

const build = (over: Partial<Mocks> = {}) => {
  const m = { ...mocks(), ...over };
  const service = new SubscriptionService(
    m.subscriptionRepository as never,
    m.integrationService as never,
    m.organizationService as never
  );

  return { service, ...m };
};

const channels = (count: number, disabled = false) =>
  Array.from({ length: count }, (_, i) => ({ id: `i${i}`, disabled }));

describe('SubscriptionService repository delegation', () => {
  it('forwards plain reads and writes', async () => {
    const { service, subscriptionRepository } = build();

    await service.getSubscriptionByOrganizationId('org-1');
    await service.getCode('promo');
    await service.updateCustomerId('org-1', 'cus_1');
    await service.checkSubscription('org-1', 'sub-1');
    await service.getSubscriptionByIdentifier('ident');
    await service.getSubscription('org-1');

    expect(
      subscriptionRepository.getSubscriptionByOrganizationId
    ).toHaveBeenCalledWith('org-1');
    expect(subscriptionRepository.updateCustomerId).toHaveBeenCalledWith(
      'org-1',
      'cus_1'
    );
    expect(subscriptionRepository.checkSubscription).toHaveBeenCalledWith(
      'org-1',
      'sub-1'
    );
  });

  it('runs a credited operation through the repository', async () => {
    const { service, subscriptionRepository } = build();
    const work = vi.fn(async () => 'done');

    await expect(
      service.useCredit({ id: 'org-1' } as never, 'ai_videos', work)
    ).resolves.toBe('done');
    expect(subscriptionRepository.useCredit).toHaveBeenCalledWith(
      { id: 'org-1' },
      'ai_videos',
      work
    );
  });
});

describe('SubscriptionService.modifySubscription', () => {
  it('does nothing without a customer id', async () => {
    const { service, integrationService } = build();

    await expect(service.modifySubscription('', 10, 'TEAM')).resolves.toBe(
      false
    );
    expect(integrationService.getIntegrationsList).not.toHaveBeenCalled();
  });

  it('does nothing when no organization owns the customer', async () => {
    const { service, subscriptionRepository } = build();
    subscriptionRepository.getOrganizationByCustomerId.mockResolvedValue(null);

    await expect(service.modifySubscription('cus_1', 10, 'TEAM')).resolves.toBe(
      false
    );
  });

  it('never downgrades a lifetime subscription', async () => {
    const { service, subscriptionRepository, integrationService } = build();
    subscriptionRepository.getSubscriptionByCustomerId.mockResolvedValue({
      isLifetime: true,
      subscriptionTier: 'PRO',
      provider: 'stripe',
    });

    await expect(service.modifySubscription('cus_1', 0, 'FREE')).resolves.toBe(
      false
    );
    expect(integrationService.disableIntegrations).not.toHaveBeenCalled();
  });

  it('disables exactly the channels above the new allowance', async () => {
    const { service, integrationService } = build();
    integrationService.getIntegrationsList.mockResolvedValue(channels(12));

    await service.modifySubscription('cus_1', 10, 'TEAM');

    expect(integrationService.disableIntegrations).toHaveBeenCalledWith(
      'org-1',
      2
    );
  });

  it('ignores already disabled channels when counting', async () => {
    const { service, integrationService } = build();
    integrationService.getIntegrationsList.mockResolvedValue([
      ...channels(10),
      ...channels(5, true),
    ]);

    await service.modifySubscription('cus_1', 10, 'TEAM');

    expect(integrationService.disableIntegrations).not.toHaveBeenCalled();
  });

  it('locks team members out when moving to a plan without them', async () => {
    const { service, subscriptionRepository, organizationService } = build();
    subscriptionRepository.getSubscriptionByCustomerId.mockResolvedValue({
      subscriptionTier: 'TEAM',
      provider: 'stripe',
    });

    await service.modifySubscription('cus_1', 0, 'FREE');

    expect(
      organizationService.disableOrEnableNonSuperAdminUsers
    ).toHaveBeenCalledWith('org-1', true);
  });

  it('restores team members when moving to a plan that includes them', async () => {
    const { service, subscriptionRepository, organizationService } = build();
    subscriptionRepository.getSubscriptionByCustomerId.mockResolvedValue({
      subscriptionTier: 'STANDARD',
      provider: 'stripe',
    });

    await service.modifySubscription('cus_1', 10, 'TEAM');

    expect(
      organizationService.disableOrEnableNonSuperAdminUsers
    ).toHaveBeenCalledWith('org-1', false);
  });

  it('leaves team members alone when both plans include them', async () => {
    const { service, subscriptionRepository, organizationService } = build();
    subscriptionRepository.getSubscriptionByCustomerId.mockResolvedValue({
      subscriptionTier: 'TEAM',
      provider: 'stripe',
    });

    await service.modifySubscription('cus_1', 30, 'PRO');

    expect(
      organizationService.disableOrEnableNonSuperAdminUsers
    ).not.toHaveBeenCalled();
  });

  it('resets the posting cron when dropping to free', async () => {
    const { service, integrationService } = build();

    await service.modifySubscription('cus_1', 0, 'FREE');

    expect(integrationService.changeActiveCron).toHaveBeenCalledWith('org-1');
  });

  it('leaves the cron alone on a paid plan', async () => {
    const { service, integrationService } = build();

    await expect(service.modifySubscription('cus_1', 10, 'TEAM')).resolves.toBe(
      true
    );
    expect(integrationService.changeActiveCron).not.toHaveBeenCalled();
  });
});

describe('SubscriptionService.modifySubscriptionByOrg', () => {
  it('does nothing without an organization id', async () => {
    const { service, integrationService } = build();

    await expect(service.modifySubscriptionByOrg('', 10, 'TEAM')).resolves.toBe(
      false
    );
    expect(integrationService.getIntegrationsList).not.toHaveBeenCalled();
  });

  it('disables the channels above the new allowance', async () => {
    const { service, integrationService } = build();
    integrationService.getIntegrationsList.mockResolvedValue(channels(4));

    await expect(
      service.modifySubscriptionByOrg('org-1', 1, 'STANDARD')
    ).resolves.toBe(true);
    expect(integrationService.disableIntegrations).toHaveBeenCalledWith(
      'org-1',
      3
    );
  });

  it('locks team members out and resets the cron on a drop to free', async () => {
    const { service, subscriptionRepository, organizationService, integrationService } =
      build();
    subscriptionRepository.getSubscriptionByOrgId.mockResolvedValue({
      subscriptionTier: 'PRO',
      provider: 'revenuecat',
    });

    await service.modifySubscriptionByOrg('org-1', 0, 'FREE');

    expect(
      organizationService.disableOrEnableNonSuperAdminUsers
    ).toHaveBeenCalledWith('org-1', true);
    expect(integrationService.changeActiveCron).toHaveBeenCalledWith('org-1');
  });

  it('restores team members when upgrading into a team plan', async () => {
    const { service, organizationService } = build();

    await service.modifySubscriptionByOrg('org-1', 10, 'TEAM');

    expect(
      organizationService.disableOrEnableNonSuperAdminUsers
    ).toHaveBeenCalledWith('org-1', false);
  });
});

describe('SubscriptionService.deleteSubscription', () => {
  it('refuses to touch a subscription owned by another provider', async () => {
    const { service, subscriptionRepository } = build();
    subscriptionRepository.getSubscriptionByCustomerId.mockResolvedValue({
      provider: 'revenuecat',
    });

    await expect(
      service.deleteSubscription('cus_1', 'stripe')
    ).resolves.toEqual({ count: 0 });
    expect(
      subscriptionRepository.deleteSubscriptionByCustomerId
    ).not.toHaveBeenCalled();
  });

  it('downgrades to free before deleting its own subscription', async () => {
    const { service, subscriptionRepository, integrationService } = build();
    subscriptionRepository.getSubscriptionByCustomerId.mockResolvedValue({
      provider: 'stripe',
      subscriptionTier: 'TEAM',
    });

    await expect(
      service.deleteSubscription('cus_1', 'stripe')
    ).resolves.toEqual({ count: 1 });

    expect(integrationService.changeActiveCron).toHaveBeenCalledWith('org-1');
    expect(
      subscriptionRepository.deleteSubscriptionByCustomerId
    ).toHaveBeenCalledWith('cus_1', 'stripe');
  });

  it('treats a customer with no subscription as its own to delete', async () => {
    const { service, subscriptionRepository } = build();

    await expect(
      service.deleteSubscription('cus_1', 'stripe')
    ).resolves.toEqual({ count: 1 });
  });
});

describe('SubscriptionService.deleteSubscriptionByOrgId', () => {
  it('does nothing when the organization has no subscription', async () => {
    const { service, subscriptionRepository } = build();

    await expect(
      service.deleteSubscriptionByOrgId('org-1', 'revenuecat')
    ).resolves.toBe(false);
    expect(
      subscriptionRepository.deleteSubscriptionByOrgId
    ).not.toHaveBeenCalled();
  });

  it('refuses when another provider manages the subscription', async () => {
    const { service, subscriptionRepository } = build();
    subscriptionRepository.getSubscriptionByOrgId.mockResolvedValue({
      provider: 'stripe',
      isLifetime: false,
    });

    await expect(
      service.deleteSubscriptionByOrgId('org-1', 'revenuecat')
    ).resolves.toBe(false);
  });

  it('refuses to delete a lifetime subscription', async () => {
    const { service, subscriptionRepository } = build();
    subscriptionRepository.getSubscriptionByOrgId.mockResolvedValue({
      provider: 'revenuecat',
      isLifetime: true,
    });

    await expect(
      service.deleteSubscriptionByOrgId('org-1', 'revenuecat')
    ).resolves.toBe(false);
  });

  it('downgrades to free then deletes its own subscription', async () => {
    const { service, subscriptionRepository, integrationService } = build();
    subscriptionRepository.getSubscriptionByOrgId.mockResolvedValue({
      provider: 'revenuecat',
      isLifetime: false,
      subscriptionTier: 'TEAM',
    });

    await expect(
      service.deleteSubscriptionByOrgId('org-1', 'revenuecat')
    ).resolves.toEqual({ count: 1 });
    expect(integrationService.changeActiveCron).toHaveBeenCalledWith('org-1');
    expect(
      subscriptionRepository.deleteSubscriptionByOrgId
    ).toHaveBeenCalledWith('org-1', 'revenuecat');
  });
});

describe('SubscriptionService.createOrUpdateSubscription', () => {
  it('stores the subscription after applying the plan change', async () => {
    const { service, subscriptionRepository } = build();

    await expect(
      service.createOrUpdateSubscription(
        'stripe',
        false,
        'ident',
        'cus_1',
        10,
        'TEAM',
        'MONTHLY',
        null
      )
    ).resolves.toEqual({ id: 'sub-1' });

    expect(
      subscriptionRepository.createOrUpdateSubscription
    ).toHaveBeenCalledWith(
      'stripe',
      false,
      'ident',
      'cus_1',
      10,
      'TEAM',
      'MONTHLY',
      null,
      undefined,
      undefined
    );
  });

  it('attaches the organization when one is given', async () => {
    const { service, subscriptionRepository } = build();

    await service.createOrUpdateSubscription(
      'stripe',
      false,
      'ident',
      'cus_1',
      10,
      'TEAM',
      'MONTHLY',
      null,
      undefined,
      'org-9'
    );

    expect(
      subscriptionRepository.createOrUpdateSubscription
    ).toHaveBeenCalledWith(
      'stripe',
      false,
      'ident',
      'cus_1',
      10,
      'TEAM',
      'MONTHLY',
      null,
      undefined,
      { id: 'org-9' }
    );
  });

  it('skips the plan change entirely for a redeemed code', async () => {
    const { service, subscriptionRepository, integrationService } = build();

    await service.createOrUpdateSubscription(
      'stripe',
      false,
      'ident',
      'cus_1',
      10,
      'TEAM',
      'MONTHLY',
      null,
      'LIFETIME-CODE'
    );

    expect(integrationService.getIntegrationsList).not.toHaveBeenCalled();
    expect(
      subscriptionRepository.createOrUpdateSubscription
    ).toHaveBeenCalled();
  });

  it('backs off when another provider owns the customer', async () => {
    const { service, subscriptionRepository } = build();
    subscriptionRepository.getSubscriptionByCustomerId.mockResolvedValue({
      provider: 'revenuecat',
    });

    await expect(
      service.createOrUpdateSubscription(
        'stripe',
        false,
        'ident',
        'cus_1',
        10,
        'TEAM',
        'MONTHLY',
        null
      )
    ).resolves.toEqual({});
    expect(
      subscriptionRepository.createOrUpdateSubscription
    ).not.toHaveBeenCalled();
  });

  it('backs off when the plan change reports it did nothing', async () => {
    const { service, subscriptionRepository } = build();
    subscriptionRepository.getOrganizationByCustomerId.mockResolvedValue(null);

    await expect(
      service.createOrUpdateSubscription(
        'stripe',
        false,
        'ident',
        'cus_1',
        10,
        'TEAM',
        'MONTHLY',
        null
      )
    ).resolves.toEqual({});
    expect(
      subscriptionRepository.createOrUpdateSubscription
    ).not.toHaveBeenCalled();
  });

  it('backs off when the plan change throws', async () => {
    const { service, subscriptionRepository, integrationService } = build();
    integrationService.getIntegrationsList.mockRejectedValue(
      new Error('database down')
    );

    await expect(
      service.createOrUpdateSubscription(
        'stripe',
        false,
        'ident',
        'cus_1',
        10,
        'TEAM',
        'MONTHLY',
        null
      )
    ).resolves.toEqual({});
    expect(
      subscriptionRepository.createOrUpdateSubscription
    ).not.toHaveBeenCalled();
  });
});

describe('SubscriptionService.createOrUpdateSubscriptionByOrg', () => {
  it('stores a store-managed subscription keyed by organization', async () => {
    const { service, subscriptionRepository } = build();

    await expect(
      service.createOrUpdateSubscriptionByOrg(
        false,
        'org-1',
        'revenuecat',
        'ident',
        10,
        'TEAM',
        'MONTHLY',
        null
      )
    ).resolves.toEqual({ id: 'sub-1' });

    expect(
      subscriptionRepository.createOrUpdateSubscription
    ).toHaveBeenCalledWith(
      'revenuecat',
      false,
      'ident',
      '',
      10,
      'TEAM',
      'MONTHLY',
      null,
      undefined,
      { id: 'org-1' }
    );
  });

  it('refuses to overwrite a lifetime subscription', async () => {
    const { service, subscriptionRepository } = build();
    subscriptionRepository.getSubscriptionByOrgId.mockResolvedValue({
      isLifetime: true,
      provider: 'revenuecat',
    });

    await expect(
      service.createOrUpdateSubscriptionByOrg(
        false,
        'org-1',
        'revenuecat',
        'ident',
        10,
        'TEAM',
        'MONTHLY',
        null
      )
    ).resolves.toEqual({});
  });

  it('refuses when another provider owns the organization subscription', async () => {
    const { service, subscriptionRepository } = build();
    subscriptionRepository.getSubscriptionByOrgId.mockResolvedValue({
      isLifetime: false,
      provider: 'stripe',
    });

    await expect(
      service.createOrUpdateSubscriptionByOrg(
        false,
        'org-1',
        'revenuecat',
        'ident',
        10,
        'TEAM',
        'MONTHLY',
        null
      )
    ).resolves.toEqual({});
  });

  it('backs off when the plan change throws', async () => {
    const { service, subscriptionRepository, integrationService } = build();
    integrationService.getIntegrationsList.mockRejectedValue(
      new Error('database down')
    );

    await expect(
      service.createOrUpdateSubscriptionByOrg(
        false,
        'org-1',
        'revenuecat',
        'ident',
        10,
        'TEAM',
        'MONTHLY',
        null
      )
    ).resolves.toEqual({});
    expect(
      subscriptionRepository.createOrUpdateSubscription
    ).not.toHaveBeenCalled();
  });
});

describe('SubscriptionService.checkCredits', () => {
  const paying = (over: Record<string, unknown> = {}) =>
    ({
      id: 'org-1',
      subscription: {
        subscriptionTier: 'TEAM',
        createdAt: dayjs().subtract(10, 'day').toDate(),
        ...over,
      },
    } as never);

  it('gives a free organization no credits at all', async () => {
    const { service, subscriptionRepository } = build();

    await expect(
      service.checkCredits({ id: 'org-1' } as never)
    ).resolves.toEqual({ credits: 0 });
    expect(subscriptionRepository.getCreditsFrom).not.toHaveBeenCalled();
  });

  it('reports the image allowance left for the plan', async () => {
    const { service, subscriptionRepository } = build();
    subscriptionRepository.getCreditsFrom.mockResolvedValue(30);

    await expect(service.checkCredits(paying())).resolves.toEqual({
      credits: 70,
    });
  });

  it('uses the video allowance when asked about videos', async () => {
    const { service, subscriptionRepository } = build();
    subscriptionRepository.getCreditsFrom.mockResolvedValue(4);

    await expect(service.checkCredits(paying(), 'ai_videos')).resolves.toEqual({
      credits: 6,
    });
    expect(subscriptionRepository.getCreditsFrom).toHaveBeenCalledWith(
      'org-1',
      expect.anything(),
      'ai_videos'
    );
  });

  it('counts usage from the current billing month, not from signup', async () => {
    const { service, subscriptionRepository } = build();
    const createdAt = dayjs().subtract(10, 'month').subtract(3, 'day');

    await service.checkCredits(paying({ createdAt: createdAt.toDate() }));

    const [, from] = subscriptionRepository.getCreditsFrom.mock.calls[0];
    expect(dayjs(from).isAfter(dayjs().subtract(1, 'month'))).toBe(true);
    expect(dayjs(from).isBefore(dayjs())).toBe(true);
  });

  it('can report a negative balance once the allowance is exceeded', async () => {
    const { service, subscriptionRepository } = build();
    subscriptionRepository.getCreditsFrom.mockResolvedValue(120);

    await expect(service.checkCredits(paying())).resolves.toEqual({
      credits: -20,
    });
  });
});

describe('SubscriptionService.addSubscription', () => {
  it('claims the customer id then records the plan', async () => {
    const { service, subscriptionRepository } = build();

    await service.addSubscription('org-1', 'user-1', 'TEAM', 'stripe');

    expect(subscriptionRepository.setCustomerId).toHaveBeenCalledWith(
      'org-1',
      'user-1'
    );
    expect(
      subscriptionRepository.createOrUpdateSubscription
    ).toHaveBeenCalledWith(
      'stripe',
      false,
      expect.any(String),
      'user-1',
      10,
      'TEAM',
      'MONTHLY',
      null,
      undefined,
      { id: 'org-1' }
    );
  });
});
