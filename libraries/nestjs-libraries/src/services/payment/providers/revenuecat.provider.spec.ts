import dayjs from 'dayjs';

import { RevenueCatProvider } from './revenuecat.provider';

type Mocks = ReturnType<typeof mocks>;

const mocks = () => ({
  subscriptionService: {
    deleteSubscriptionByOrgId: vi.fn(async () => true),
    createOrUpdateSubscriptionByOrg: vi.fn(
      async (
        _isTrialing: boolean,
        _orgId: string,
        _provider: string,
        _identifier: string,
        _channels: number,
        _billing: string,
        _period: string,
        _cancelAt: number | null
      ) => ({ id: 'sub-1' })
    ),
  },
  organizationService: {
    getOrgById: vi.fn(async () => ({ id: 'org-1' } as any)),
  },
});

const build = (over: Partial<Mocks> = {}) => {
  const m = { ...mocks(), ...over };
  const provider = new RevenueCatProvider(
    m.subscriptionService as never,
    m.organizationService as never
  );

  return { provider, ...m };
};

const subscription = (over: Record<string, unknown> = {}) => ({
  expires_date: dayjs().add(30, 'day').toISOString(),
  purchase_date: dayjs().subtract(1, 'day').toISOString(),
  original_purchase_date: dayjs().subtract(1, 'day').toISOString(),
  unsubscribe_detected_at: null,
  billing_issues_detected_at: null,
  is_sandbox: false,
  store: 'app_store',
  period_type: 'normal',
  ...over,
});

const subscriber = (subscriptions: Record<string, unknown>) =>
  vi.fn(async () => Response.json({ subscriber: { subscriptions } }));

beforeEach(() => {
  vi.stubEnv('REVENUECAT_SECRET_KEY', 'sk_revenuecat');
  vi.stubEnv('REVENUECAT_WEBHOOK_SECRET', 'whsec_rc');
  vi.stubEnv('IN_APP_PURCHASE_REJECT_SANDBOX', '');
});

describe('RevenueCatProvider.validateWebhook', () => {
  it('parses the body when the shared secret matches', () => {
    const { provider } = build();

    expect(
      provider.validateWebhook(Buffer.from('{"event":{"type":"TEST"}}'), {
        authorization: 'whsec_rc',
      })
    ).toEqual({ event: { type: 'TEST' } });
  });

  it('refuses a request with the wrong secret', () => {
    const { provider } = build();

    expect(() =>
      provider.validateWebhook(Buffer.from('{}'), { authorization: 'nope' })
    ).toThrow(/Invalid webhook authorization/);
  });

  it('refuses every webhook when no secret is configured', () => {
    const { provider } = build();
    vi.stubEnv('REVENUECAT_WEBHOOK_SECRET', '');

    expect(() =>
      provider.validateWebhook(Buffer.from('{}'), { authorization: '' })
    ).toThrow(/Invalid webhook authorization/);
  });
});

describe('RevenueCatProvider.processWebhook', () => {
  it('ignores a payload with no event', async () => {
    const { provider, organizationService } = build();

    await expect(provider.processWebhook({})).resolves.toEqual({ ok: true });
    expect(organizationService.getOrgById).not.toHaveBeenCalled();
  });

  it('ignores the revenuecat test event', async () => {
    const { provider, organizationService } = build();

    await expect(
      provider.processWebhook({ event: { type: 'TEST' } })
    ).resolves.toEqual({ ok: true });
    expect(organizationService.getOrgById).not.toHaveBeenCalled();
  });

  it('re-checks every organization the event names, only once each', async () => {
    const { provider, organizationService } = build();
    organizationService.getOrgById.mockResolvedValue(null);

    await provider.processWebhook({
      event: {
        type: 'RENEWAL',
        app_user_id: 'org-1',
        original_app_user_id: 'org-1',
        transferred_to: ['org-2'],
      },
    });

    expect(organizationService.getOrgById).toHaveBeenCalledTimes(2);
    expect(organizationService.getOrgById).toHaveBeenCalledWith('org-1');
    expect(organizationService.getOrgById).toHaveBeenCalledWith('org-2');
  });

  it('skips an anonymous revenuecat id, which is not an organization', async () => {
    const { provider, organizationService } = build();
    organizationService.getOrgById.mockResolvedValue(null);

    await provider.processWebhook({
      event: { type: 'RENEWAL', app_user_id: '$RCAnonymousID:abc' },
    });

    expect(organizationService.getOrgById).not.toHaveBeenCalled();
  });
});

describe('RevenueCatProvider.syncSubscription', () => {
  it('does nothing for an organization that no longer exists', async () => {
    const { provider, organizationService, subscriptionService } = build();
    organizationService.getOrgById.mockResolvedValue(null);

    await expect(provider.syncSubscription('org-1')).resolves.toEqual({
      active: false,
    });
    expect(
      subscriptionService.createOrUpdateSubscriptionByOrg
    ).not.toHaveBeenCalled();
  });

  it('removes the plan when the store reports nothing active', async () => {
    const { provider, subscriptionService } = build();
    vi.stubGlobal('fetch', subscriber({}));

    await expect(provider.syncSubscription('org-1')).resolves.toEqual({
      active: false,
    });
    expect(subscriptionService.deleteSubscriptionByOrgId).toHaveBeenCalledWith(
      'org-1',
      'revenuecat'
    );
  });

  it('records an active subscription with the tier from the product id', async () => {
    const { provider, subscriptionService } = build();
    vi.stubGlobal(
      'fetch',
      subscriber({ 'com.postiz.mob.pro.yearly': subscription() })
    );

    await expect(provider.syncSubscription('org-1')).resolves.toEqual({
      active: true,
    });
    expect(
      subscriptionService.createOrUpdateSubscriptionByOrg
    ).toHaveBeenCalledWith(
      false,
      'org-1',
      'revenuecat',
      'com.postiz.mob.pro.yearly',
      30,
      'PRO',
      'YEARLY',
      null
    );
  });

  it('marks a store intro offer as a trial', async () => {
    const { provider, subscriptionService } = build();
    vi.stubGlobal(
      'fetch',
      subscriber({
        'com.postiz.mob.team.monthly': subscription({ period_type: 'trial' }),
      })
    );

    await provider.syncSubscription('org-1');

    const [isTrialing] =
      subscriptionService.createOrUpdateSubscriptionByOrg.mock.calls[0];
    expect(isTrialing).toBe(true);
  });

  it('carries the cancellation date once the user unsubscribes in the store', async () => {
    const expires = dayjs().add(10, 'day');
    const { provider, subscriptionService } = build();
    vi.stubGlobal(
      'fetch',
      subscriber({
        'com.postiz.mob.pro.monthly': subscription({
          unsubscribe_detected_at: dayjs().toISOString(),
          expires_date: expires.toISOString(),
        }),
      })
    );

    await provider.syncSubscription('org-1');

    const call =
      subscriptionService.createOrUpdateSubscriptionByOrg.mock.calls[0];
    expect(call[7]).toBe(expires.unix());
  });

  it('reads the tier from an underscore separated product id', async () => {
    const { provider, subscriptionService } = build();
    vi.stubGlobal(
      'fetch',
      subscriber({ 'com_postiz_ultimate_monthly': subscription() })
    );

    await provider.syncSubscription('org-1');

    const call =
      subscriptionService.createOrUpdateSubscriptionByOrg.mock.calls[0];
    expect(call[5]).toBe('ULTIMATE');
    expect(call[6]).toBe('MONTHLY');
  });

  it('refuses a product identifier it cannot map to a plan', async () => {
    const { provider } = build();
    vi.stubGlobal('fetch', subscriber({ 'com.postiz.lifetime': subscription() }));

    await expect(provider.syncSubscription('org-1')).rejects.toThrow(
      /Unknown RevenueCat product identifier/
    );
  });

  it('ignores an expired entitlement', async () => {
    const { provider, subscriptionService } = build();
    vi.stubGlobal(
      'fetch',
      subscriber({
        'com.postiz.mob.pro.monthly': subscription({
          expires_date: dayjs().subtract(1, 'day').toISOString(),
        }),
      })
    );

    await expect(provider.syncSubscription('org-1')).resolves.toEqual({
      active: false,
    });
    expect(subscriptionService.deleteSubscriptionByOrgId).toHaveBeenCalled();
  });

  it('keeps a lifetime entitlement that never expires', async () => {
    const { provider } = build();
    vi.stubGlobal(
      'fetch',
      subscriber({
        'com.postiz.mob.pro.monthly': subscription({ expires_date: null }),
      })
    );

    await expect(provider.syncSubscription('org-1')).resolves.toEqual({
      active: true,
    });
  });

  it('picks the entitlement that runs longest', async () => {
    const { provider, subscriptionService } = build();
    vi.stubGlobal(
      'fetch',
      subscriber({
        'com.postiz.mob.standard.monthly': subscription({
          expires_date: dayjs().add(5, 'day').toISOString(),
        }),
        'com.postiz.mob.pro.yearly': subscription({
          expires_date: dayjs().add(300, 'day').toISOString(),
        }),
      })
    );

    await provider.syncSubscription('org-1');

    const call =
      subscriptionService.createOrUpdateSubscriptionByOrg.mock.calls[0];
    expect(call[5]).toBe('PRO');
  });

  it('accepts a sandbox purchase by default', async () => {
    const { provider } = build();
    vi.stubGlobal(
      'fetch',
      subscriber({
        'com.postiz.mob.pro.monthly': subscription({ is_sandbox: true }),
      })
    );

    await expect(provider.syncSubscription('org-1')).resolves.toEqual({
      active: true,
    });
  });

  it('rejects a sandbox purchase when the instance opts out', async () => {
    const { provider } = build();
    vi.stubEnv('IN_APP_PURCHASE_REJECT_SANDBOX', 'true');
    vi.stubGlobal(
      'fetch',
      subscriber({
        'com.postiz.mob.pro.monthly': subscription({ is_sandbox: true }),
      })
    );

    await expect(provider.syncSubscription('org-1')).resolves.toEqual({
      active: false,
    });
  });

  it('refuses to run when revenuecat is not configured', async () => {
    const { provider } = build();
    vi.stubEnv('REVENUECAT_SECRET_KEY', '');

    await expect(provider.syncSubscription('org-1')).rejects.toThrow(
      /RevenueCat is not configured/
    );
  });

  it('surfaces a failed subscriber lookup rather than dropping the plan', async () => {
    const { provider, subscriptionService } = build();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('nope', { status: 503 }))
    );

    await expect(provider.syncSubscription('org-1')).rejects.toThrow(
      /subscriber request failed \(503\)/
    );
    expect(
      subscriptionService.deleteSubscriptionByOrgId
    ).not.toHaveBeenCalled();
  });

  it('authenticates the subscriber lookup with the secret key', async () => {
    const fetchSpy = subscriber({});
    const { provider } = build();
    vi.stubGlobal('fetch', fetchSpy);

    await provider.syncSubscription('org with spaces');

    const [url, init] = fetchSpy.mock.calls[0] as unknown as [
      string,
      RequestInit
    ];
    expect(url).toContain('org%20with%20spaces');
    expect((init.headers as Record<string, string>).Authorization).toBe(
      'Bearer sk_revenuecat'
    );
  });
});

describe('RevenueCatProvider.cancelAllSubscriptions', () => {
  it('never cancels, because only the store can', async () => {
    const { provider, subscriptionService } = build();

    await expect(
      provider.cancelAllSubscriptions('org-1')
    ).resolves.toBeUndefined();
    expect(
      subscriptionService.deleteSubscriptionByOrgId
    ).not.toHaveBeenCalled();
  });
});
