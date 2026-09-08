const s = vi.hoisted(() => ({
  webhooks: { constructEvent: vi.fn() },
  paymentMethods: { list: vi.fn(), detach: vi.fn() },
  paymentIntents: { create: vi.fn(), cancel: vi.fn() },
  subscriptions: {
    list: vi.fn(),
    update: vi.fn(),
    cancel: vi.fn(),
    retrieve: vi.fn(),
    deleteDiscount: vi.fn(),
  },
  customers: { create: vi.fn(), update: vi.fn() },
  prices: { list: vi.fn(), create: vi.fn() },
  products: { list: vi.fn(), create: vi.fn() },
  invoices: { createPreview: vi.fn(), retrieve: vi.fn() },
  billingPortal: { sessions: { create: vi.fn() } },
  promotionCodes: { list: vi.fn() },
  checkout: { sessions: { create: vi.fn() } },
  charges: { list: vi.fn() },
  refunds: { create: vi.fn() },
  coupons: { create: vi.fn() },
}));

// The service holds a module-level Stripe client, so the sdk itself is the
// only seam: the constructor hands back the same mock every time.
vi.mock('stripe', () => ({
  default: class {
    constructor() {
      return s as never;
    }
  },
}));

import { AuthService } from '@gitroom/helpers/auth/auth.service';
import { StripeService } from './stripe.service';

type Mocks = ReturnType<typeof mocks>;

const mocks = () => ({
  subscriptionService: {
    createOrUpdateSubscription: vi.fn(async () => ({ id: 'sub-1' })),
    deleteSubscription: vi.fn(async () => ({ count: 1 })),
    updateCustomerId: vi.fn(),
    checkSubscription: vi.fn(async () => null as any),
    getSubscription: vi.fn(async () => null as any),
    getSubscriptionByOrganizationId: vi.fn(async () => null as any),
    getCode: vi.fn(async () => null as any),
  },
  organizationService: {
    getOrgByCustomerId: vi.fn(async () => ({ allowTrial: false } as any)),
    getOrgById: vi.fn(async () => ({ id: 'org-1', name: 'Acme', paymentId: 'cus_1' } as any)),
    getOrgsByUserId: vi.fn(async () => [] as any[]),
    getTeam: vi.fn(async () => ({ users: [{ user: { email: 'a@b.c' } }] } as any)),
  },
  userService: {
    getUserById: vi.fn(async () => ({ id: 'u1', email: 'a@b.c' } as any)),
  },
  trackService: { track: vi.fn() },
});

const build = (over: Partial<Mocks> = {}) => {
  const m = { ...mocks(), ...over };
  const service = new StripeService(
    m.subscriptionService as never,
    m.organizationService as never,
    m.userService as never,
    m.trackService as never
  );

  return { service, ...m };
};

const list = (data: unknown[]) => ({ data });

const subscription = (over: Record<string, unknown> = {}) => ({
  id: 'sub_1',
  status: 'active',
  cancel_at_period_end: false,
  discounts: [],
  items: { data: [{ id: 'si_1', price: { recurring: { interval: 'month' } } }] },
  metadata: {},
  ...over,
});

const charge = (over: Record<string, unknown> = {}) => ({
  id: 'ch_1',
  amount: 3900,
  currency: 'usd',
  created: Math.floor(Date.now() / 1000),
  status: 'succeeded',
  refunded: false,
  amount_refunded: 0,
  description: 'Postiz',
  receipt_url: 'https://receipt',
  invoice: 'in_1',
  ...over,
});

const subscriptionEvent = (over: Record<string, unknown> = {}) => ({
  type: 'customer.subscription.created',
  id: 'evt_1',
  data: {
    object: {
      id: 'sub_1',
      status: 'active',
      customer: 'cus_1',
      cancel_at: null,
      metadata: {
        service: 'gitroom',
        uniqueId: 'u-1',
        billing: 'STANDARD',
        period: 'MONTHLY',
      },
      ...over,
    },
  },
});

beforeEach(() => {
  vi.stubEnv('JWT_SECRET', 'test-secret');
  vi.stubEnv('FRONTEND_URL', 'https://app.example.com');
  s.subscriptions.list.mockResolvedValue(list([]));
  s.subscriptions.update.mockResolvedValue({ cancel_at: null });
  s.subscriptions.cancel.mockResolvedValue({});
  s.charges.list.mockResolvedValue(list([]));
  s.products.list.mockResolvedValue(list([]));
  s.prices.list.mockResolvedValue(list([]));
  s.products.create.mockResolvedValue({ id: 'prod_1' });
  s.prices.create.mockResolvedValue({ id: 'price_1' });
  s.customers.create.mockResolvedValue({ id: 'cus_new' });
  s.customers.update.mockResolvedValue({});
  s.promotionCodes.list.mockResolvedValue(list([]));
  s.checkout.sessions.create.mockResolvedValue({
    client_secret: 'cs_secret',
    url: 'https://checkout',
  });
  s.billingPortal.sessions.create.mockResolvedValue({ url: 'https://portal' });
  s.refunds.create.mockResolvedValue({ id: 're_1' });
  s.coupons.create.mockResolvedValue({ id: 'coup_1' });
});

describe('StripeService webhook routing', () => {
  it('verifies the signature against the signing key', () => {
    const { service } = build();
    vi.stubEnv('STRIPE_SIGNING_KEY', 'whsec_1');
    s.webhooks.constructEvent.mockReturnValue({ type: 'ping' });

    const body = Buffer.from('{}');
    expect(service.validateWebhook(body, { 'stripe-signature': 'sig' })).toEqual({
      type: 'ping',
    });
    expect(s.webhooks.constructEvent).toHaveBeenCalledWith(
      body,
      'sig',
      'whsec_1'
    );
  });

  it('ignores an event addressed to another service', async () => {
    const { service, subscriptionService } = build();

    await expect(
      service.processWebhook(
        subscriptionEvent({ metadata: { service: 'something-else' } }) as never
      )
    ).resolves.toEqual({ ok: true });
    expect(subscriptionService.createOrUpdateSubscription).not.toHaveBeenCalled();
  });

  it('always accepts a payment succeeded event, whoever sent it', async () => {
    const { service } = build();
    s.subscriptions.retrieve.mockResolvedValue(subscription());

    await expect(
      service.processWebhook({
        type: 'invoice.payment_succeeded',
        id: 'evt_1',
        data: { object: { metadata: {}, amount_paid: 3900, parent: null } },
      } as never)
    ).resolves.toEqual({ ok: true });
  });

  it('routes a created subscription to the subscription service', async () => {
    const { service, subscriptionService } = build();

    await service.processWebhook(subscriptionEvent() as never);

    expect(subscriptionService.createOrUpdateSubscription).toHaveBeenCalledWith(
      'stripe',
      false,
      'u-1',
      'cus_1',
      expect.any(Number),
      'STANDARD',
      'MONTHLY',
      null
    );
  });

  it('routes an updated subscription and flags a trial as not yet active', async () => {
    const { service, subscriptionService } = build();

    await service.processWebhook({
      ...subscriptionEvent({ status: 'trialing' }),
      type: 'customer.subscription.updated',
    } as never);

    expect(subscriptionService.createOrUpdateSubscription).toHaveBeenCalledWith(
      'stripe',
      true,
      'u-1',
      'cus_1',
      expect.any(Number),
      'STANDARD',
      'MONTHLY',
      null
    );
  });

  it('routes a deleted subscription to a removal', async () => {
    const { service, subscriptionService } = build();

    await service.processWebhook({
      type: 'customer.subscription.deleted',
      id: 'evt_1',
      data: { object: { customer: 'cus_1', metadata: { service: 'gitroom' } } },
    } as never);

    expect(subscriptionService.deleteSubscription).toHaveBeenCalledWith(
      'cus_1',
      'stripe'
    );
  });

  it('acknowledges an event type it does not act on', async () => {
    const { service } = build();

    await expect(
      service.processWebhook({
        type: 'customer.updated',
        id: 'evt_1',
        data: { object: { metadata: { service: 'gitroom' } } },
      } as never)
    ).resolves.toEqual({ ok: true });
  });
});

describe('StripeService.checkValidCard', () => {
  it('refuses a subscription stripe could not complete', async () => {
    const { service } = build();

    await expect(
      service.checkValidCard(subscriptionEvent({ status: 'incomplete' }) as never)
    ).resolves.toBe(false);
  });

  it('skips the card check when the organization is not on a trial', async () => {
    const { service } = build();

    await expect(
      service.checkValidCard(subscriptionEvent() as never)
    ).resolves.toBe(true);
    expect(s.paymentIntents.create).not.toHaveBeenCalled();
  });

  it('refuses a trial with no payment method on file', async () => {
    const { service, organizationService } = build();
    organizationService.getOrgByCustomerId.mockResolvedValue({ allowTrial: true });
    s.paymentMethods.list.mockResolvedValue(list([]));

    await expect(
      service.checkValidCard(subscriptionEvent() as never)
    ).resolves.toBe(false);
  });

  it('authorizes and immediately releases a hold on the newest card', async () => {
    const { service, organizationService } = build();
    organizationService.getOrgByCustomerId.mockResolvedValue({ allowTrial: true });
    s.paymentMethods.list.mockResolvedValue(
      list([
        { id: 'pm_old', created: 1 },
        { id: 'pm_new', created: 2 },
      ])
    );
    s.paymentIntents.create.mockResolvedValue({
      id: 'pi_1',
      status: 'requires_capture',
    });

    await expect(
      service.checkValidCard(subscriptionEvent() as never)
    ).resolves.toBe(true);

    expect(s.paymentIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({ payment_method: 'pm_new', amount: 100 })
    );
    expect(s.paymentIntents.cancel).toHaveBeenCalledWith('pi_1');
  });

  it('detaches the card and cancels the subscription when the hold fails', async () => {
    const { service, organizationService } = build();
    organizationService.getOrgByCustomerId.mockResolvedValue({ allowTrial: true });
    s.paymentMethods.list.mockResolvedValue(list([{ id: 'pm_1', created: 1 }]));
    s.paymentIntents.create.mockResolvedValue({ id: 'pi_1', status: 'requires_payment_method' });

    await expect(
      service.checkValidCard(subscriptionEvent() as never)
    ).resolves.toBe(false);
    expect(s.paymentMethods.detach).toHaveBeenCalledWith('pm_1');
    expect(s.subscriptions.cancel).toHaveBeenCalledWith('sub_1');
  });

  it('cleans up after a card that stripe rejected outright', async () => {
    const { service, organizationService } = build();
    organizationService.getOrgByCustomerId.mockResolvedValue({ allowTrial: true });
    s.paymentMethods.list.mockResolvedValue(list([{ id: 'pm_1', created: 1 }]));
    s.paymentIntents.create.mockRejectedValue(new Error('card_declined'));

    await expect(
      service.checkValidCard(subscriptionEvent() as never)
    ).resolves.toBe(false);
    expect(s.paymentMethods.detach).toHaveBeenCalledWith('pm_1');
  });

  it('still refuses when even the cleanup fails', async () => {
    const { service, organizationService } = build();
    organizationService.getOrgByCustomerId.mockResolvedValue({ allowTrial: true });
    s.paymentMethods.list.mockResolvedValue(list([{ id: 'pm_1', created: 1 }]));
    s.paymentIntents.create.mockRejectedValue(new Error('card_declined'));
    s.paymentMethods.detach.mockRejectedValue(new Error('already detached'));

    await expect(
      service.checkValidCard(subscriptionEvent() as never)
    ).resolves.toBe(false);
  });

  it('does not record a subscription when the card check fails', async () => {
    const { service, subscriptionService, organizationService } = build();
    organizationService.getOrgByCustomerId.mockRejectedValue(new Error('down'));

    await expect(
      service.createSubscription(subscriptionEvent() as never)
    ).resolves.toEqual({ ok: false });
    expect(subscriptionService.createOrUpdateSubscription).not.toHaveBeenCalled();
  });

  it('does not update a subscription when the card check fails', async () => {
    const { service, subscriptionService, organizationService } = build();
    organizationService.getOrgByCustomerId.mockResolvedValue({ allowTrial: true });
    s.paymentMethods.list.mockResolvedValue(list([]));

    await expect(
      service.updateSubscription(subscriptionEvent() as never)
    ).resolves.toEqual({ ok: false });
    expect(subscriptionService.createOrUpdateSubscription).not.toHaveBeenCalled();
  });
});

describe('StripeService customer handling', () => {
  it('reuses an existing stripe customer', async () => {
    const { service } = build();

    await expect(
      service.createOrGetCustomer({ id: 'org-1', paymentId: 'cus_1' } as never)
    ).resolves.toBe('cus_1');
    expect(s.customers.create).not.toHaveBeenCalled();
  });

  it('creates a customer and remembers it against the organization', async () => {
    const { service, subscriptionService } = build();

    await expect(
      service.createOrGetCustomer({ id: 'org-1', name: 'Acme' } as never)
    ).resolves.toBe('cus_new');
    expect(s.customers.create).toHaveBeenCalledWith({
      email: 'a@b.c',
      name: 'Acme',
    });
    expect(subscriptionService.updateCustomerId).toHaveBeenCalledWith(
      'org-1',
      'cus_new'
    );
  });

  it('invents an address for a login that is not an email', async () => {
    const { service, organizationService } = build();
    organizationService.getTeam.mockResolvedValue({
      users: [{ user: { email: 'dana' } }],
    });

    await service.createOrGetCustomer({ id: 'org-1', name: 'Acme' } as never);

    expect(s.customers.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'dana@postiz.com' })
    );
  });

  it('reads the customer id straight off the organization', async () => {
    const { service } = build();

    await expect(service.getCustomerByOrganizationId('org-1')).resolves.toBe(
      'cus_1'
    );
  });

  it('opens a billing portal that returns to the billing page', async () => {
    const { service } = build();

    await expect(service.portalLink('org-1')).resolves.toEqual({
      url: 'https://portal',
    });
    expect(s.billingPortal.sessions.create).toHaveBeenCalledWith({
      customer: 'cus_1',
      return_url: 'https://app.example.com/billing',
    });
  });
});

describe('StripeService.syncCustomerEmailsAfterSwitch', () => {
  it('does nothing when stripe is not configured', async () => {
    const { service } = build();
    vi.stubEnv('STRIPE_PUBLISHABLE_KEY', '');

    await service.syncCustomerEmailsAfterSwitch([{ id: 'u1', email: 'a@b.c' }]);

    expect(s.customers.update).not.toHaveBeenCalled();
  });

  it('moves the billing email only for organizations the account owns', async () => {
    const { service, organizationService } = build();
    vi.stubEnv('STRIPE_PUBLISHABLE_KEY', 'pk_1');
    organizationService.getOrgsByUserId.mockResolvedValue([
      { paymentId: 'cus_owned', users: [{ role: 'SUPERADMIN' }] },
      { paymentId: 'cus_member', users: [{ role: 'ADMIN' }] },
    ]);

    await service.syncCustomerEmailsAfterSwitch([{ id: 'u1', email: 'a@b.c' }]);

    expect(s.customers.update).toHaveBeenCalledTimes(1);
    expect(s.customers.update).toHaveBeenCalledWith('cus_owned', {
      email: 'a@b.c',
    });
  });

  it('skips an admin granted subscription that has no stripe customer', async () => {
    const { service, organizationService } = build();
    vi.stubEnv('STRIPE_PUBLISHABLE_KEY', 'pk_1');
    organizationService.getOrgsByUserId.mockResolvedValue([
      { paymentId: 'user-id-not-a-customer', users: [{ role: 'SUPERADMIN' }] },
    ]);

    await service.syncCustomerEmailsAfterSwitch([{ id: 'u1', email: 'a@b.c' }]);

    expect(s.customers.update).not.toHaveBeenCalled();
  });

  it('writes each customer once and keeps going past a stripe failure', async () => {
    const { service, organizationService } = build();
    vi.stubEnv('STRIPE_PUBLISHABLE_KEY', 'pk_1');
    organizationService.getOrgsByUserId.mockResolvedValue([
      { paymentId: 'cus_shared', users: [{ role: 'SUPERADMIN' }] },
    ]);
    s.customers.update.mockRejectedValue(new Error('no such customer'));

    await expect(
      service.syncCustomerEmailsAfterSwitch([
        { id: 'u1', email: 'a@b.c' },
        { id: 'u2', email: 'd@e.f' },
      ])
    ).resolves.toBeUndefined();

    expect(s.customers.update).toHaveBeenCalledTimes(1);
  });

  it('invents an address for a login that is not an email', async () => {
    const { service, organizationService } = build();
    vi.stubEnv('STRIPE_PUBLISHABLE_KEY', 'pk_1');
    organizationService.getOrgsByUserId.mockResolvedValue([
      { paymentId: 'cus_1', users: [{ role: 'SUPERADMIN' }] },
    ]);

    await service.syncCustomerEmailsAfterSwitch([{ id: 'u1', email: 'dana' }]);

    expect(s.customers.update).toHaveBeenCalledWith('cus_1', {
      email: 'dana@postiz.com',
    });
  });
});

describe('StripeService.getPackages', () => {
  it('groups the published prices by billing interval', async () => {
    const { service } = build();
    s.prices.list.mockResolvedValue(
      list([
        {
          product: { name: 'Standard' },
          recurring: { interval: 'month' },
          tiers: [{ unit_amount: 2900 }],
        },
        {
          product: { name: 'Standard' },
          recurring: { interval: 'year' },
          tiers: [{ unit_amount: 29000 }],
        },
      ])
    );

    await expect(service.getPackages()).resolves.toEqual({
      month: [{ name: 'Standard', recurring: 'month', price: 29 }],
      year: [{ name: 'Standard', recurring: 'year', price: 290 }],
    });
  });
});

describe('StripeService.prorate', () => {
  it('previews the amount due for the plan change', async () => {
    const { service } = build();
    s.subscriptions.list.mockResolvedValue(list([subscription()]));
    s.invoices.createPreview.mockResolvedValue({ amount_due: 1234 });

    await expect(
      service.prorate('org-1', { billing: 'PRO', period: 'MONTHLY' } as never)
    ).resolves.toEqual({ price: 12.34 });
  });

  it('reports nothing due when stripe returns no amount', async () => {
    const { service } = build();
    s.invoices.createPreview.mockResolvedValue({ amount_due: 0 });

    await expect(
      service.prorate('org-1', { billing: 'PRO', period: 'YEARLY' } as never)
    ).resolves.toEqual({ price: 0 });
  });

  it('falls back to zero rather than failing the upgrade screen', async () => {
    const { service } = build();
    s.invoices.createPreview.mockRejectedValue(new Error('no upcoming invoice'));

    await expect(
      service.prorate('org-1', { billing: 'PRO', period: 'MONTHLY' } as never)
    ).resolves.toEqual({ price: 0 });
  });

  it('creates the product and price when the plan has never been sold', async () => {
    const { service } = build();
    s.invoices.createPreview.mockResolvedValue({ amount_due: 0 });

    await service.prorate('org-1', {
      billing: 'PRO',
      period: 'MONTHLY',
    } as never);

    expect(s.products.create).toHaveBeenCalledWith({ active: true, name: 'PRO' });
    expect(s.prices.create).toHaveBeenCalledWith(
      expect.objectContaining({
        nickname: 'PRO MONTHLY',
        recurring: { interval: 'month' },
      })
    );
  });

  it('reuses a matching product and price', async () => {
    const { service } = build();
    s.products.list.mockResolvedValue(list([{ id: 'prod_pro', name: 'pro' }]));
    s.prices.list.mockResolvedValue(
      list([
        {
          id: 'price_pro',
          nickname: 'PRO MONTHLY',
          recurring: { interval: 'month' },
          unit_amount: 4900,
        },
      ])
    );
    s.invoices.createPreview.mockResolvedValue({ amount_due: 0 });

    await service.prorate('org-1', {
      billing: 'PRO',
      period: 'MONTHLY',
    } as never);

    expect(s.products.create).not.toHaveBeenCalled();
    expect(s.prices.create).not.toHaveBeenCalled();
  });
});

describe('StripeService.setToCancel', () => {
  it('refuses when there is nothing to cancel', async () => {
    const { service } = build();

    await expect(service.setToCancel('org-1')).rejects.toThrow(
      /No active subscription found/
    );
  });

  it('undoes a pending cancellation when the user toggles back', async () => {
    const { service } = build();
    s.subscriptions.list.mockResolvedValue(
      list([subscription({ cancel_at_period_end: true })])
    );
    s.subscriptions.update.mockResolvedValue({ cancel_at: null });

    await expect(service.setToCancel('org-1')).resolves.toMatchObject({
      cancel_at: undefined,
    });
    expect(s.subscriptions.update).toHaveBeenCalledWith(
      'sub_1',
      expect.objectContaining({ cancel_at_period_end: false })
    );
  });

  it('cancels at the end of the period when payments are healthy', async () => {
    const { service } = build();
    s.subscriptions.list.mockResolvedValue(list([subscription()]));
    s.subscriptions.update.mockResolvedValue({ cancel_at: 1735689600 });

    await expect(service.setToCancel('org-1')).resolves.toMatchObject({
      cancel_at: new Date(1735689600 * 1000),
    });
    expect(s.subscriptions.update).toHaveBeenCalledWith(
      'sub_1',
      expect.objectContaining({ cancel_at_period_end: true })
    );
  });

  it.each([
    ['a past due subscription', { status: 'past_due' }],
    ['an open invoice', { latest_invoice: { status: 'open' } }],
    ['an uncollectible invoice', { latest_invoice: { status: 'uncollectible' } }],
  ] as [string, Record<string, unknown>][])(
    'cancels immediately on %s',
    async (_label, over) => {
      const { service, subscriptionService } = build();
      s.subscriptions.list.mockResolvedValue(list([subscription(over)]));

      await expect(service.setToCancel('org-1')).resolves.toMatchObject({
        cancel_at: expect.any(Date),
      });
      expect(s.subscriptions.cancel).toHaveBeenCalledWith('sub_1');
      expect(subscriptionService.deleteSubscription).toHaveBeenCalledWith(
        'cus_1',
        'stripe'
      );
    }
  );
});

describe('StripeService.cancelAllSubscriptions', () => {
  it('does nothing when stripe is not configured', async () => {
    const { service, organizationService } = build();
    vi.stubEnv('STRIPE_PUBLISHABLE_KEY', '');

    await service.cancelAllSubscriptions('org-1');

    expect(organizationService.getOrgById).not.toHaveBeenCalled();
  });

  it('does nothing for an organization that never paid', async () => {
    const { service, organizationService } = build();
    vi.stubEnv('STRIPE_PUBLISHABLE_KEY', 'pk_1');
    organizationService.getOrgById.mockResolvedValue({ id: 'org-1' });

    await service.cancelAllSubscriptions('org-1');

    expect(s.subscriptions.list).not.toHaveBeenCalled();
  });

  it('cancels every live subscription and forgets the plan', async () => {
    const { service, subscriptionService } = build();
    vi.stubEnv('STRIPE_PUBLISHABLE_KEY', 'pk_1');
    s.subscriptions.list.mockResolvedValue(
      list([
        subscription({ id: 'sub_a' }),
        subscription({ id: 'sub_b', status: 'canceled' }),
      ])
    );

    await service.cancelAllSubscriptions('org-1');

    expect(s.subscriptions.cancel).toHaveBeenCalledTimes(1);
    expect(s.subscriptions.cancel).toHaveBeenCalledWith('sub_a');
    expect(subscriptionService.deleteSubscription).toHaveBeenCalledWith(
      'cus_1',
      'stripe'
    );
  });
});

describe('StripeService trials and discounts', () => {
  it('ends the running trial immediately', async () => {
    const { service } = build();
    s.subscriptions.list.mockResolvedValue(
      list([subscription({ id: 'sub_t', status: 'trialing' })])
    );

    await service.finishTrial({ paymentId: 'cus_1' } as never);

    expect(s.subscriptions.update).toHaveBeenCalledWith('sub_t', {
      trial_end: 'now',
    });
  });

  it('offers no discount when none is configured', async () => {
    const { service } = build();
    vi.stubEnv('STRIPE_DISCOUNT_ID', '');

    await expect(
      service.checkDiscount({ paymentId: 'cus_1' } as never)
    ).resolves.toBe(false);
  });

  it('offers no discount to a customer who never paid enough', async () => {
    const { service } = build();
    vi.stubEnv('STRIPE_DISCOUNT_ID', 'coup_x');
    s.charges.list.mockResolvedValue(list([charge({ amount: 100 })]));

    await expect(
      service.checkDiscount({ paymentId: 'cus_1' } as never)
    ).resolves.toBe(false);
  });

  it('offers no discount on a yearly plan', async () => {
    const { service } = build();
    vi.stubEnv('STRIPE_DISCOUNT_ID', 'coup_x');
    s.charges.list.mockResolvedValue(list([charge()]));
    s.subscriptions.list.mockResolvedValue(
      list([
        subscription({
          items: { data: [{ price: { recurring: { interval: 'year' } } }] },
        }),
      ])
    );

    await expect(
      service.checkDiscount({ paymentId: 'cus_1' } as never)
    ).resolves.toBe(false);
  });

  it('offers no second discount to an already discounted subscription', async () => {
    const { service } = build();
    vi.stubEnv('STRIPE_DISCOUNT_ID', 'coup_x');
    s.charges.list.mockResolvedValue(list([charge()]));
    s.subscriptions.list.mockResolvedValue(
      list([subscription({ discounts: [{ id: 'di_1' }] })])
    );

    await expect(
      service.checkDiscount({ paymentId: 'cus_1' } as never)
    ).resolves.toBe(false);
  });

  it('offers the discount to a paying monthly customer', async () => {
    const { service } = build();
    vi.stubEnv('STRIPE_DISCOUNT_ID', 'coup_x');
    s.charges.list.mockResolvedValue(list([charge()]));
    s.subscriptions.list.mockResolvedValue(list([subscription()]));

    await expect(
      service.checkDiscount({ paymentId: 'cus_1' } as never)
    ).resolves.toBe(true);
  });

  it('attaches the configured coupon to the live subscription', async () => {
    const { service } = build();
    vi.stubEnv('STRIPE_DISCOUNT_ID', 'coup_x');
    s.charges.list.mockResolvedValue(list([charge()]));
    s.subscriptions.list.mockResolvedValue(list([subscription()]));

    await expect(
      service.applyDiscount({ paymentId: 'cus_1' } as never)
    ).resolves.toBe(true);
    expect(s.subscriptions.update).toHaveBeenCalledWith('sub_1', {
      discounts: [{ coupon: 'coup_x' }],
    });
  });
});

describe('StripeService.checkSubscription', () => {
  it('reports a known subscription straight away', async () => {
    const { service, subscriptionService } = build();
    subscriptionService.checkSubscription.mockResolvedValue({ id: 'sub' });

    await expect(service.checkSubscription('org-1', 'u-1')).resolves.toBe(2);
  });

  it('reports nothing when the customer has no subscriptions', async () => {
    const { service } = build();

    await expect(service.checkSubscription('org-1', 'u-1')).resolves.toBe(0);
  });

  it('reports a cancelled subscription for the given unique id', async () => {
    const { service } = build();
    s.subscriptions.list.mockResolvedValue(
      list([subscription({ metadata: { uniqueId: 'u-1' }, canceled_at: 123 })])
    );

    await expect(service.checkSubscription('org-1', 'u-1')).resolves.toBe(1);
  });

  it('reports nothing when the unique id does not match', async () => {
    const { service } = build();
    s.subscriptions.list.mockResolvedValue(
      list([subscription({ metadata: { uniqueId: 'other' } })])
    );

    await expect(service.checkSubscription('org-1', 'u-1')).resolves.toBe(0);
  });
});

describe('StripeService.embedded', () => {
  it('returns the checkout client secret', async () => {
    const { service } = build();

    await expect(
      service.embedded(
        'ud-1',
        'org-1',
        'u1',
        { billing: 'PRO', period: 'MONTHLY' } as never,
        false
      )
    ).resolves.toEqual({ client_secret: 'cs_secret' });
  });

  it('offers a trial when the organization is entitled to one', async () => {
    const { service } = build();

    await service.embedded(
      'ud-1',
      'org-1',
      'u1',
      { billing: 'PRO', period: 'MONTHLY' } as never,
      true
    );

    expect(s.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        subscription_data: expect.objectContaining({ trial_period_days: 7 }),
      })
    );
  });

  it('attaches an auto-apply promotion code on a monthly plan', async () => {
    const { service } = build();
    s.promotionCodes.list.mockResolvedValue(
      list([
        {
          code: 'WELCOME',
          metadata: { autoapply: 'true' },
          promotion: { coupon: { metadata: {} } },
        },
      ])
    );

    await expect(
      service.embedded(
        'ud-1',
        'org-1',
        'u1',
        { billing: 'PRO', period: 'MONTHLY' } as never,
        false
      )
    ).resolves.toEqual({
      client_secret: 'cs_secret',
      auto_apply_coupon: 'WELCOME',
    });
  });

  it('never auto-applies on a yearly plan', async () => {
    const { service } = build();

    await service.embedded(
      'ud-1',
      'org-1',
      'u1',
      { billing: 'PRO', period: 'YEARLY' } as never,
      false
    );

    expect(s.promotionCodes.list).not.toHaveBeenCalled();
    expect(s.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({ allow_promotion_codes: false })
    );
  });

  it.each([
    ['an expired code', { expires_at: 1, metadata: { autoapply: 'true' } }],
    ['a code without the flag', { metadata: {} }],
    [
      'a fully redeemed code',
      { metadata: { autoapply: 'true' }, max_redemptions: 1, times_redeemed: 1 },
    ],
  ] as [string, Record<string, unknown>][])(
    'ignores %s',
    async (_label, over) => {
      const { service } = build();
      s.promotionCodes.list.mockResolvedValue(
        list([{ code: 'X', promotion: { coupon: { metadata: {} } }, ...over }])
      );

      await expect(
        service.embedded(
          'ud-1',
          'org-1',
          'u1',
          { billing: 'PRO', period: 'MONTHLY' } as never,
          false
        )
      ).resolves.toEqual({ client_secret: 'cs_secret' });
    }
  );

  it('ignores a coupon whose redemption window closed', async () => {
    const { service } = build();
    s.promotionCodes.list.mockResolvedValue(
      list([
        {
          code: 'X',
          metadata: { autoapply: 'true' },
          promotion: { coupon: { redeem_by: 1, metadata: {} } },
        },
      ])
    );

    await expect(
      service.embedded(
        'ud-1',
        'org-1',
        'u1',
        { billing: 'PRO', period: 'MONTHLY' } as never,
        false
      )
    ).resolves.toEqual({ client_secret: 'cs_secret' });
  });

  it('survives a promotion lookup that fails', async () => {
    const { service } = build();
    s.promotionCodes.list.mockRejectedValue(new Error('stripe down'));

    await expect(
      service.embedded(
        'ud-1',
        'org-1',
        'u1',
        { billing: 'PRO', period: 'MONTHLY' } as never,
        false
      )
    ).resolves.toEqual({ client_secret: 'cs_secret' });
  });

  it('records the referral identifiers on the customer', async () => {
    const { service } = build();

    await service.embedded(
      'ud-1',
      'org-1',
      'u1',
      { billing: 'PRO', period: 'MONTHLY', dub: 'click-1' } as never,
      false
    );

    expect(s.customers.update).toHaveBeenCalledWith(
      'cus_1',
      expect.objectContaining({
        metadata: { dubCustomerExternalId: 'u1', dubClickId: 'click-1' },
      })
    );
  });

  it('continues to checkout even when the customer update fails', async () => {
    const { service } = build();
    s.customers.update.mockRejectedValue(new Error('no such customer'));

    await expect(
      service.embedded(
        'ud-1',
        'org-1',
        'u1',
        { billing: 'PRO', period: 'MONTHLY' } as never,
        false
      )
    ).resolves.toEqual({ client_secret: 'cs_secret' });
  });
});

describe('StripeService.subscribe', () => {
  it('sends a first-time buyer to a hosted checkout', async () => {
    const { service } = build();

    await expect(
      service.subscribe(
        'ud-1',
        'org-1',
        'u1',
        { billing: 'PRO', period: 'MONTHLY' } as never,
        false
      )
    ).resolves.toEqual({ url: 'https://checkout' });
  });

  it('records the referral click for a first-time buyer', async () => {
    const { service } = build();

    await service.subscribe(
      'ud-1',
      'org-1',
      'u1',
      { billing: 'PRO', period: 'MONTHLY', dub: 'click-1' } as never,
      false
    );

    expect(s.customers.update).toHaveBeenCalledWith('cus_1', {
      metadata: { dubCustomerExternalId: 'u1', dubClickId: 'click-1' },
    });
  });

  it('upgrades an existing subscription in place', async () => {
    const { service, subscriptionService } = build();
    subscriptionService.getSubscription.mockResolvedValue({ id: 'sub' });
    s.subscriptions.list.mockResolvedValue(list([subscription()]));

    await expect(
      service.subscribe(
        'ud-1',
        'org-1',
        'u1',
        { billing: 'PRO', period: 'MONTHLY' } as never,
        false
      )
    ).resolves.toEqual({ id: expect.any(String) });
    expect(s.subscriptions.update).toHaveBeenCalledWith(
      'sub_1',
      expect.objectContaining({ proration_behavior: 'always_invoice' })
    );
  });

  it('falls back to the billing portal when the upgrade is refused', async () => {
    const { service, subscriptionService } = build();
    subscriptionService.getSubscription.mockResolvedValue({ id: 'sub' });
    s.subscriptions.list.mockResolvedValue(list([subscription()]));
    s.subscriptions.update.mockRejectedValue(new Error('needs payment method'));

    await expect(
      service.subscribe(
        'ud-1',
        'org-1',
        'u1',
        { billing: 'PRO', period: 'MONTHLY' } as never,
        false
      )
    ).resolves.toEqual({ portal: 'https://portal' });
  });
});

describe('StripeService.paymentSucceeded', () => {
  it('ignores an invoice that is not tied to a subscription', async () => {
    const { service, trackService } = build();

    await expect(
      service.paymentSucceeded({
        data: { object: { parent: null, amount_paid: 100 } },
      } as never)
    ).resolves.toEqual({ ok: true });
    expect(trackService.track).not.toHaveBeenCalled();
  });

  it('tracks the purchase against the buyer', async () => {
    const { service, trackService, userService } = build();
    s.subscriptions.retrieve.mockResolvedValue(
      subscription({ metadata: { userId: 'u1', ud: 'ud-1' } })
    );
    userService.getUserById.mockResolvedValue({
      id: 'u1',
      ip: '1.2.3.4',
      agent: 'firefox',
    });

    await service.paymentSucceeded({
      data: {
        object: {
          parent: { subscription_details: { subscription: 'sub_1' } },
          amount_paid: 3900,
        },
      },
    } as never);

    expect(trackService.track).toHaveBeenCalledWith(
      'ud-1',
      '1.2.3.4',
      'firefox',
      expect.anything(),
      { value: 39 }
    );
  });

  it('accepts an expanded subscription object on the invoice', async () => {
    const { service } = build();
    s.subscriptions.retrieve.mockResolvedValue(subscription());

    await service.paymentSucceeded({
      data: {
        object: {
          parent: { subscription_details: { subscription: { id: 'sub_9' } } },
          amount_paid: 100,
        },
      },
    } as never);

    expect(s.subscriptions.retrieve).toHaveBeenCalledWith('sub_9');
  });

  it('does not track a buyer with no recorded device', async () => {
    const { service, trackService } = build();
    s.subscriptions.retrieve.mockResolvedValue(subscription());

    await service.paymentSucceeded({
      data: {
        object: {
          parent: { subscription_details: { subscription: 'sub_1' } },
          amount_paid: 100,
        },
      },
    } as never);

    expect(trackService.track).not.toHaveBeenCalled();
  });
});

describe('StripeService.getCharges', () => {
  it('returns nothing for an organization that never paid', async () => {
    const { service, organizationService } = build();
    organizationService.getOrgById.mockResolvedValue({ id: 'org-1' });

    await expect(service.getCharges('org-1')).resolves.toEqual([]);
  });

  it('lists only successful charges and attaches the invoice pdf', async () => {
    const { service } = build();
    s.charges.list.mockResolvedValue(
      list([charge(), charge({ id: 'ch_2', status: 'failed' })])
    );
    s.invoices.retrieve.mockResolvedValue({ invoice_pdf: 'https://pdf' });

    const charges = await service.getCharges('org-1');

    expect(charges).toHaveLength(1);
    expect(charges[0]).toMatchObject({ id: 'ch_1', invoice_pdf: 'https://pdf' });
  });

  it('still lists a charge whose invoice cannot be read', async () => {
    const { service } = build();
    s.charges.list.mockResolvedValue(list([charge()]));
    s.invoices.retrieve.mockRejectedValue(new Error('gone'));

    await expect(service.getCharges('org-1')).resolves.toMatchObject([
      { id: 'ch_1', invoice_pdf: null },
    ]);
  });

  it('handles a charge with no invoice at all', async () => {
    const { service } = build();
    s.charges.list.mockResolvedValue(list([charge({ invoice: null })]));

    await expect(service.getCharges('org-1')).resolves.toMatchObject([
      { invoice: null, invoice_pdf: null },
    ]);
    expect(s.invoices.retrieve).not.toHaveBeenCalled();
  });
});

describe('StripeService.refundCharges', () => {
  it('refuses for an organization with no stripe customer', async () => {
    const { service, organizationService } = build();
    organizationService.getOrgById.mockResolvedValue({ id: 'org-1' });

    await expect(service.refundCharges('org-1', ['ch_1'])).rejects.toThrow(
      /No payment customer found/
    );
  });

  it('reports which refunds succeeded and which did not', async () => {
    const { service } = build();
    s.refunds.create
      .mockResolvedValueOnce({ id: 're_1' })
      .mockRejectedValueOnce(new Error('already refunded'));

    await expect(
      service.refundCharges('org-1', ['ch_1', 'ch_2'])
    ).resolves.toEqual({ refunded: ['ch_1'], failed: ['ch_2'] });
  });
});

describe('StripeService.cancelSubscription', () => {
  it('refuses for an organization with no stripe customer', async () => {
    const { service, organizationService } = build();
    organizationService.getOrgById.mockResolvedValue({ id: 'org-1' });

    await expect(service.cancelSubscription('org-1')).rejects.toThrow(
      /No payment customer found/
    );
  });

  it('refuses when nothing is live', async () => {
    const { service } = build();
    s.subscriptions.list.mockResolvedValue(
      list([subscription({ status: 'canceled' })])
    );

    await expect(service.cancelSubscription('org-1')).rejects.toThrow(
      /No active subscription found/
    );
  });

  it('cancels the live subscription and forgets the plan', async () => {
    const { service, subscriptionService } = build();
    s.subscriptions.list.mockResolvedValue(list([subscription()]));

    await expect(service.cancelSubscription('org-1')).resolves.toEqual({
      cancelled: true,
    });
    expect(s.subscriptions.cancel).toHaveBeenCalledWith('sub_1');
    expect(subscriptionService.deleteSubscription).toHaveBeenCalledWith(
      'cus_1',
      'stripe'
    );
  });
});

describe('StripeService.getCouponInfo', () => {
  it('reports an unsubscribed organization as unsupported', async () => {
    const { service } = build();

    await expect(service.getCouponInfo('org-1')).resolves.toMatchObject({
      tier: null,
      coupons: [],
      supported: false,
      nextPayment: null,
    });
  });

  it('never looks up stripe for an admin granted subscription', async () => {
    const { service, organizationService } = build();
    organizationService.getOrgById.mockResolvedValue({
      id: 'org-1',
      paymentId: 'not-a-customer',
    });

    await service.getCouponInfo('org-1');

    expect(s.subscriptions.list).not.toHaveBeenCalled();
  });

  it('describes a percentage coupon and the next payment', async () => {
    const { service, subscriptionService } = build();
    subscriptionService.getSubscriptionByOrganizationId.mockResolvedValue({
      subscriptionTier: 'PRO',
      period: 'MONTHLY',
      isLifetime: false,
    });
    s.subscriptions.list.mockResolvedValue(
      list([
        subscription({
          discounts: [
            {
              end: null,
              source: { coupon: { percent_off: 20, duration: 'forever' } },
            },
          ],
        }),
      ])
    );
    s.invoices.createPreview.mockResolvedValue({ total: 3920 });

    await expect(service.getCouponInfo('org-1')).resolves.toMatchObject({
      tier: 'PRO',
      planPrice: 49,
      nextPayment: 39.2,
      coupons: [
        {
          type: 'percentage',
          value: 20,
          duration: 'forever',
          remainingMonths: null,
        },
      ],
      supported: false,
    });
  });

  it('describes a fixed amount coupon with a remaining term', async () => {
    const { service, subscriptionService } = build();
    subscriptionService.getSubscriptionByOrganizationId.mockResolvedValue({
      subscriptionTier: 'PRO',
      period: 'MONTHLY',
    });
    s.subscriptions.list.mockResolvedValue(
      list([
        subscription({
          discounts: [
            {
              end: Math.floor(Date.now() / 1000) + 60 * 24 * 60 * 60,
              source: {
                coupon: {
                  amount_off: 500,
                  duration: 'repeating',
                  duration_in_months: 3,
                },
              },
            },
          ],
        }),
      ])
    );
    s.invoices.createPreview.mockResolvedValue({ total: 0 });

    const info = await service.getCouponInfo('org-1');

    expect(info.coupons[0]).toMatchObject({
      type: 'amount',
      value: 5,
      durationInMonths: 3,
    });
    expect(info.coupons[0].remainingMonths).toBeGreaterThan(0);
  });

  it('supports a plain monthly subscription with no coupon', async () => {
    const { service, subscriptionService } = build();
    subscriptionService.getSubscriptionByOrganizationId.mockResolvedValue({
      subscriptionTier: 'PRO',
      period: 'MONTHLY',
      isLifetime: false,
    });
    s.subscriptions.list.mockResolvedValue(list([subscription()]));
    s.invoices.createPreview.mockResolvedValue({ total: 4900 });

    await expect(service.getCouponInfo('org-1')).resolves.toMatchObject({
      supported: true,
    });
  });

  it('reports the yearly price for a yearly plan', async () => {
    const { service, subscriptionService } = build();
    subscriptionService.getSubscriptionByOrganizationId.mockResolvedValue({
      subscriptionTier: 'PRO',
      period: 'YEARLY',
    });

    await expect(service.getCouponInfo('org-1')).resolves.toMatchObject({
      planPrice: 470,
      supported: false,
    });
  });

  it('leaves the next payment unknown when the preview fails', async () => {
    const { service, subscriptionService } = build();
    subscriptionService.getSubscriptionByOrganizationId.mockResolvedValue({
      subscriptionTier: 'PRO',
      period: 'MONTHLY',
    });
    s.subscriptions.list.mockResolvedValue(list([subscription()]));
    s.invoices.createPreview.mockRejectedValue(new Error('no invoice'));

    await expect(service.getCouponInfo('org-1')).resolves.toMatchObject({
      nextPayment: null,
    });
  });
});

describe('StripeService.applyCoupon', () => {
  const supported = (over: Partial<Mocks> = {}) => {
    const built = build(over);
    built.subscriptionService.getSubscriptionByOrganizationId.mockResolvedValue({
      subscriptionTier: 'PRO',
      period: 'MONTHLY',
      isLifetime: false,
    });
    s.subscriptions.list.mockResolvedValue(list([subscription()]));
    s.invoices.createPreview.mockResolvedValue({ total: 4900 });
    return built;
  };

  it('refuses for a subscription that cannot take one', async () => {
    const { service } = build();

    await expect(
      service.applyCoupon('org-1', { type: 'percentage', value: 10, months: 1 })
    ).resolves.toMatchObject({ applied: false, reason: expect.any(String) });
  });

  it.each([
    ['percentage', 0],
    ['percentage', 101],
    ['amount', 0],
    ['amount', 1000],
  ] as [string, number][])('refuses an out of range %s of %s', async (type, value) => {
    const { service } = supported();

    await expect(
      service.applyCoupon('org-1', { type, value, months: 1 })
    ).resolves.toEqual({ applied: false, reason: 'Invalid coupon value' });
  });

  it('creates a one-off percentage coupon and attaches it', async () => {
    const { service } = supported();

    await expect(
      service.applyCoupon('org-1', { type: 'percentage', value: 20, months: 1 })
    ).resolves.toEqual({ applied: true });

    expect(s.coupons.create).toHaveBeenCalledWith(
      expect.objectContaining({ percent_off: 20, duration: 'once' })
    );
    expect(s.subscriptions.update).toHaveBeenCalledWith('sub_1', {
      discounts: [{ coupon: 'coup_1' }],
    });
  });

  it('creates a repeating fixed amount coupon', async () => {
    const { service } = supported();

    await service.applyCoupon('org-1', { type: 'amount', value: 5, months: 3 });

    expect(s.coupons.create).toHaveBeenCalledWith(
      expect.objectContaining({
        amount_off: 500,
        currency: 'usd',
        duration: 'repeating',
        duration_in_months: 3,
      })
    );
  });

  it('refuses when the stripe subscription disappeared meanwhile', async () => {
    const { service } = supported();
    s.subscriptions.list
      .mockResolvedValueOnce(list([subscription()]))
      .mockResolvedValueOnce(list([]));

    await expect(
      service.applyCoupon('org-1', { type: 'percentage', value: 20, months: 1 })
    ).resolves.toMatchObject({ applied: false });
  });
});

describe('StripeService.cancelCoupon', () => {
  it('refuses when there is no live subscription', async () => {
    const { service } = build();

    await expect(service.cancelCoupon('org-1')).resolves.toMatchObject({
      cancelled: false,
      reason: 'No active subscription found for this customer',
    });
  });

  it('refuses when no coupon is attached', async () => {
    const { service } = build();
    s.subscriptions.list.mockResolvedValue(list([subscription()]));

    await expect(service.cancelCoupon('org-1')).resolves.toMatchObject({
      cancelled: false,
      reason: 'No coupon is applied to this subscription',
    });
  });

  it('removes the discount from the subscription', async () => {
    const { service } = build();
    s.subscriptions.list.mockResolvedValue(
      list([subscription({ discounts: [{ id: 'di_1' }] })])
    );

    await expect(service.cancelCoupon('org-1')).resolves.toEqual({
      cancelled: true,
    });
    expect(s.subscriptions.deleteDiscount).toHaveBeenCalledWith('sub_1');
  });
});

describe('StripeService.chatbaseRefundPreview', () => {
  const eligible = () => {
    s.subscriptions.list.mockResolvedValue(list([subscription()]));
    s.charges.list.mockResolvedValue(list([charge()]));
    s.invoices.retrieve.mockResolvedValue({
      parent: { subscription_details: { subscription: 'sub_1' } },
    });
  };

  it('refuses an organization with no stripe customer', async () => {
    const { service, organizationService } = build();
    organizationService.getOrgById.mockResolvedValue({ id: 'org-1' });

    await expect(service.chatbaseRefundPreview('org-1')).resolves.toMatchObject({
      eligible: false,
      reason: 'No payment customer found for this organization',
    });
  });

  it('refuses when nothing is subscribed', async () => {
    const { service } = build();

    await expect(service.chatbaseRefundPreview('org-1')).resolves.toMatchObject({
      eligible: false,
      reason: 'No active subscription found for this customer',
    });
  });

  it('refuses a customer who was already refunded', async () => {
    const { service } = build();
    s.subscriptions.list.mockResolvedValue(list([subscription()]));
    s.charges.list.mockResolvedValue(list([charge({ refunded: true })]));

    await expect(service.chatbaseRefundPreview('org-1')).resolves.toMatchObject({
      eligible: false,
      reason: 'A refund was already issued for this customer',
    });
  });

  it('refuses when no charge belongs to the subscription', async () => {
    const { service } = build();
    s.subscriptions.list.mockResolvedValue(list([subscription()]));
    s.charges.list.mockResolvedValue(list([charge({ invoice: null })]));

    await expect(service.chatbaseRefundPreview('org-1')).resolves.toMatchObject({
      eligible: false,
      reason: 'No subscription payment found for this customer',
    });
  });

  it('refuses a payment older than sixty days', async () => {
    const { service } = build();
    s.subscriptions.list.mockResolvedValue(list([subscription()]));
    s.charges.list.mockResolvedValue(
      list([
        charge({ created: Math.floor(Date.now() / 1000) - 61 * 24 * 60 * 60 }),
      ])
    );
    s.invoices.retrieve.mockResolvedValue({
      parent: { subscription_details: { subscription: 'sub_1' } },
    });

    await expect(service.chatbaseRefundPreview('org-1')).resolves.toMatchObject({
      eligible: false,
      reason: 'The last subscription payment is older than 60 days',
    });
  });

  it('offers a full refund of the last monthly charge', async () => {
    const { service } = build();
    eligible();

    await expect(service.chatbaseRefundPreview('org-1')).resolves.toMatchObject({
      eligible: true,
      chargeId: 'ch_1',
      amount: 39,
      currency: 'usd',
      subscriptionIds: ['sub_1'],
    });
  });

  it('caps a yearly plan refund at one month', async () => {
    const { service } = build();
    s.subscriptions.list.mockResolvedValue(
      list([
        subscription({
          items: { data: [{ price: { recurring: { interval: 'year' } } }] },
        }),
      ])
    );
    s.charges.list.mockResolvedValue(list([charge({ amount: 12000 })]));
    s.invoices.retrieve.mockResolvedValue({
      parent: { subscription_details: { subscription: 'sub_1' } },
    });

    await expect(service.chatbaseRefundPreview('org-1')).resolves.toMatchObject({
      amount: 10,
    });
  });

  it('skips a charge whose invoice cannot be read', async () => {
    const { service } = build();
    s.subscriptions.list.mockResolvedValue(list([subscription()]));
    s.charges.list.mockResolvedValue(list([charge()]));
    s.invoices.retrieve.mockRejectedValue(new Error('gone'));

    await expect(service.chatbaseRefundPreview('org-1')).resolves.toMatchObject({
      eligible: false,
    });
  });
});

describe('StripeService.chatbaseRefund', () => {
  it('reports the reason when the customer is not eligible', async () => {
    const { service } = build();

    await expect(service.chatbaseRefund('org-1')).resolves.toMatchObject({
      refunded: false,
      reason: 'No active subscription found for this customer',
    });
    expect(s.refunds.create).not.toHaveBeenCalled();
  });

  it('refunds, cancels the subscription and forgets the plan', async () => {
    const { service, subscriptionService } = build();
    s.subscriptions.list.mockResolvedValue(list([subscription()]));
    s.charges.list.mockResolvedValue(list([charge()]));
    s.invoices.retrieve.mockResolvedValue({
      parent: { subscription_details: { subscription: 'sub_1' } },
    });

    await expect(service.chatbaseRefund('org-1')).resolves.toEqual({
      refunded: true,
      amount: 39,
      currency: 'usd',
      subscriptionCancelled: true,
    });

    expect(s.refunds.create).toHaveBeenCalledWith(
      expect.objectContaining({ charge: 'ch_1', amount: 3900 })
    );
    expect(s.subscriptions.cancel).toHaveBeenCalledWith('sub_1');
    expect(subscriptionService.deleteSubscription).toHaveBeenCalledWith(
      'cus_1',
      'stripe'
    );
  });
});

describe('StripeService.lifetimeDeal', () => {
  const code = () => AuthService.fixedEncryption('LIFETIME-1');

  it('refuses when a paid subscription is already running', async () => {
    const { service, subscriptionService } = build();
    subscriptionService.getSubscriptionByOrganizationId.mockResolvedValue({
      isLifetime: false,
    });

    await expect(service.lifetimeDeal('org-1', code())).rejects.toThrow(
      /already have a non lifetime subscription/
    );
  });

  it('refuses a code that was already redeemed', async () => {
    const { service, subscriptionService } = build();
    subscriptionService.getCode.mockResolvedValue({ id: 'code-1' });

    await expect(service.lifetimeDeal('org-1', code())).resolves.toEqual({
      success: false,
    });
    expect(subscriptionService.createOrUpdateSubscription).not.toHaveBeenCalled();
  });

  it('grants the standard tier on the first code', async () => {
    const { service, subscriptionService } = build();

    await expect(service.lifetimeDeal('org-1', code())).resolves.toEqual({
      success: true,
    });
    expect(subscriptionService.createOrUpdateSubscription).toHaveBeenCalledWith(
      'stripe',
      false,
      expect.any(String),
      'org-1',
      expect.any(Number),
      'STANDARD',
      'MONTHLY',
      null,
      'LIFETIME-1',
      'org-1'
    );
  });

  it('stacks five more channels onto an existing lifetime pro', async () => {
    const { service, subscriptionService } = build();
    subscriptionService.getSubscriptionByOrganizationId.mockResolvedValue({
      isLifetime: true,
      subscriptionTier: 'PRO',
      totalChannels: 30,
    });

    await service.lifetimeDeal('org-1', code());

    expect(subscriptionService.createOrUpdateSubscription).toHaveBeenCalledWith(
      'stripe',
      false,
      expect.any(String),
      'org-1',
      35,
      'PRO',
      'MONTHLY',
      null,
      'LIFETIME-1',
      'org-1'
    );
  });

  it('reports failure on a code that cannot be decrypted', async () => {
    const { service } = build();

    await expect(service.lifetimeDeal('org-1', 'not-encrypted')).resolves.toEqual(
      { success: false }
    );
  });
});
