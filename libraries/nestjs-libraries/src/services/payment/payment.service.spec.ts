import { HttpException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PaymentPlatform } from './payment.provider.interface';
import { PaymentService } from './payment.service';

const fakeProvider = (platform: PaymentPlatform) => ({
  platform,
  validateWebhook: vi.fn(),
  processWebhook: vi.fn(),
  syncSubscription: vi.fn(),
  cancelAllSubscriptions: vi.fn(async () => undefined),
  syncCustomerEmailsAfterSwitch: vi.fn(async () => undefined),
});

let stripe: ReturnType<typeof fakeProvider>;
let revenuecat: ReturnType<typeof fakeProvider>;
let registered: { name: string; provider: ReturnType<typeof fakeProvider> }[];

const manager = {
  getProvider: vi.fn((name: string) => {
    const found = registered.find((r) => r.name === name);
    if (!found) {
      throw new HttpException(`Payment provider ${name} not found`, 400);
    }
    return found.provider;
  }),
  getProviders: vi.fn(() => registered),
  getDefaultProvider: vi.fn((platform: PaymentPlatform) => {
    const found = registered.find((r) => r.provider.platform === platform);
    if (!found) {
      throw new Error(`No payment provider registered for ${platform}`);
    }
    return found;
  }),
};

const subscriptions = { getSubscriptionByOrganizationId: vi.fn() };

const service = () =>
  new PaymentService(manager as never, subscriptions as never);

const subscribedTo = (provider: string, over: Record<string, unknown> = {}) =>
  subscriptions.getSubscriptionByOrganizationId.mockResolvedValue({
    id: 'sub-1',
    organizationId: 'org-1',
    provider,
    subscriptionTier: 'PRO',
    ...over,
  });

beforeEach(() => {
  stripe = fakeProvider('web');
  revenuecat = fakeProvider('mobile');
  registered = [
    { name: 'stripe', provider: stripe },
    { name: 'revenuecat', provider: revenuecat },
  ];
  subscriptions.getSubscriptionByOrganizationId.mockResolvedValue(null);
});

describe('PaymentService.webhook', () => {
  it('validates before processing, and passes the validated event on', async () => {
    // Processing an unvalidated body is how a forged webhook grants a
    // subscription, so the order here is the assertion.
    const event = { type: 'checkout.completed' };
    stripe.validateWebhook.mockResolvedValue(event);
    stripe.processWebhook.mockResolvedValue({ ok: true });

    const body = Buffer.from('{"raw":true}');
    const headers = { 'stripe-signature': 'sig' };

    await expect(service().webhook('stripe', body, headers)).resolves.toEqual({
      ok: true,
    });

    expect(stripe.validateWebhook).toHaveBeenCalledWith(body, headers);
    expect(stripe.processWebhook).toHaveBeenCalledWith(event);
    expect(stripe.validateWebhook.mock.invocationCallOrder[0]).toBeLessThan(
      stripe.processWebhook.mock.invocationCallOrder[0]
    );
  });

  it('never processes when validation rejects', async () => {
    stripe.validateWebhook.mockRejectedValue(new Error('bad signature'));

    await expect(
      service().webhook('stripe', Buffer.from('x'), {})
    ).rejects.toThrow('bad signature');
    expect(stripe.processWebhook).not.toHaveBeenCalled();
  });

  it('routes to the named provider, not the default', async () => {
    revenuecat.validateWebhook.mockResolvedValue({ type: 'RENEWAL' });
    revenuecat.processWebhook.mockResolvedValue({ ok: true });

    await service().webhook('revenuecat', Buffer.from('x'), {});

    expect(stripe.validateWebhook).not.toHaveBeenCalled();
    expect(revenuecat.processWebhook).toHaveBeenCalled();
  });

  it('does not swallow an unknown provider, it lets the lookup throw', async () => {
    // The "not found" message itself belongs to PaymentProviderManager; what
    // is asserted here is only that PaymentService propagates rather than
    // silently returning undefined and reporting the webhook handled.
    await expect(
      service().webhook('paddle', Buffer.from('x'), {})
    ).rejects.toBeInstanceOf(HttpException);
    expect(stripe.processWebhook).not.toHaveBeenCalled();
    expect(revenuecat.processWebhook).not.toHaveBeenCalled();
  });
});

describe('PaymentService.getSubscription', () => {
  it('returns null when the organization has none', async () => {
    await expect(service().getSubscription('org-1')).resolves.toBeNull();
    expect(manager.getProvider).not.toHaveBeenCalled();
  });

  it('annotates the row with the platform that owns it', async () => {
    subscribedTo('revenuecat');

    await expect(service().getSubscription('org-1')).resolves.toMatchObject({
      provider: 'revenuecat',
      platform: 'mobile',
    });
  });

  it('still returns the row when the provider is gone from the build', async () => {
    // A subscription row outliving its provider must stay readable, otherwise
    // the user cannot even see what they are paying for.
    subscribedTo('paddle');

    await expect(service().getSubscription('org-1')).resolves.toMatchObject({
      provider: 'paddle',
      platform: undefined,
    });
  });
});

describe('PaymentService.getProviderForOrganization', () => {
  it('falls back to the platform default when there is no subscription', async () => {
    await expect(
      service().getProviderForOrganization('org-1', 'web')
    ).resolves.toBe(stripe);
    await expect(
      service().getProviderForOrganization('org-1', 'mobile')
    ).resolves.toBe(revenuecat);
  });

  it('returns the provider that owns the subscription', async () => {
    subscribedTo('revenuecat');

    await expect(
      service().getProviderForOrganization('org-1', 'mobile')
    ).resolves.toBe(revenuecat);
  });

  it('refuses to manage a mobile subscription from the web', async () => {
    // Cancelling an App Store subscription through Stripe silently does
    // nothing while telling the user it worked.
    subscribedTo('revenuecat');

    await expect(
      service().getProviderForOrganization('org-1', 'web')
    ).rejects.toThrow('Your subscription is managed on mobile');
  });

  it('refuses to manage a web subscription from mobile', async () => {
    subscribedTo('stripe');

    await expect(
      service().getProviderForOrganization('org-1', 'mobile')
    ).rejects.toThrow('Your subscription is managed on web');
  });

  it('raises a 400, not a 500, when the platforms disagree', async () => {
    subscribedTo('revenuecat');

    await expect(
      service().getProviderForOrganization('org-1', 'web')
    ).rejects.toMatchObject({ status: 400 });
  });

  it('propagates rather than returning a web provider for a mobile request', async () => {
    // The message is the manager's; the property under test is that
    // PaymentService does not fall back to "any provider will do".
    registered = [{ name: 'stripe', provider: stripe }];

    await expect(
      service().getProviderForOrganization('org-1', 'mobile')
    ).rejects.toThrow();
  });
});

describe('PaymentService.assertCanUseProvider', () => {
  it('allows anything when the organization has no subscription', async () => {
    await expect(
      service().assertCanUseProvider('org-1', 'stripe')
    ).resolves.toBeUndefined();
  });

  it('allows the provider that already owns the subscription', async () => {
    subscribedTo('stripe');

    await expect(
      service().assertCanUseProvider('org-1', 'stripe')
    ).resolves.toBeUndefined();
  });

  it('blocks a second provider on another platform, naming the platform', async () => {
    subscribedTo('revenuecat');

    await expect(service().assertCanUseProvider('org-1', 'stripe')).rejects.toThrow(
      'Your subscription is managed on mobile'
    );
  });

  it('blocks a second provider on the same platform, naming the provider', async () => {
    // Two web providers: the platform sentence would be nonsense, so the
    // message names the provider instead.
    registered.push({ name: 'paddle', provider: fakeProvider('web') });
    subscribedTo('paddle');

    await expect(service().assertCanUseProvider('org-1', 'stripe')).rejects.toThrow(
      'Your subscription is managed by paddle'
    );
  });

  it('raises a 400 either way', async () => {
    subscribedTo('revenuecat');

    await expect(
      service().assertCanUseProvider('org-1', 'stripe')
    ).rejects.toMatchObject({ status: 400 });
  });
});

describe('PaymentService.cancelAllSubscriptions', () => {
  it('cancels through the owning provider only', async () => {
    subscribedTo('stripe');

    await service().cancelAllSubscriptions('org-1');

    expect(stripe.cancelAllSubscriptions).toHaveBeenCalledWith('org-1');
    expect(revenuecat.cancelAllSubscriptions).not.toHaveBeenCalled();
  });

  it('sweeps every provider when no subscription row exists', async () => {
    // Account deletion after a missed webhook: without the sweep, a provider
    // nobody has a row for keeps charging a deleted account.
    await service().cancelAllSubscriptions('org-1');

    expect(stripe.cancelAllSubscriptions).toHaveBeenCalledWith('org-1');
    expect(revenuecat.cancelAllSubscriptions).toHaveBeenCalledWith('org-1');
  });

  it('propagates a failure from the sweep rather than reporting success', async () => {
    revenuecat.cancelAllSubscriptions.mockRejectedValue(new Error('api down'));

    await expect(service().cancelAllSubscriptions('org-1')).rejects.toThrow(
      'api down'
    );
  });
});

describe('PaymentService defaults and pass-throughs', () => {
  it('asks the manager for the default of the requested platform', () => {
    expect(service().getDefaultProvider('web')).toBe(stripe);
    expect(service().getDefaultProviderName('web')).toBe('stripe');
    expect(service().getDefaultProvider('mobile')).toBe(revenuecat);
    expect(service().getDefaultProviderName('mobile')).toBe('revenuecat');
  });

  it('syncs a subscription through the named provider', async () => {
    revenuecat.syncSubscription.mockResolvedValue({ synced: true });

    await expect(
      service().syncSubscription('revenuecat', 'org-1')
    ).resolves.toEqual({ synced: true });
    expect(revenuecat.syncSubscription).toHaveBeenCalledWith('org-1');
  });

  it('offers every provider the chance to follow an email switch', async () => {
    const accounts = [{ id: 'u-1', email: 'new@test' }];

    await service().syncCustomerEmailsAfterSwitch(accounts);

    expect(stripe.syncCustomerEmailsAfterSwitch).toHaveBeenCalledWith(accounts);
    expect(revenuecat.syncCustomerEmailsAfterSwitch).toHaveBeenCalledWith(accounts);
  });
});
