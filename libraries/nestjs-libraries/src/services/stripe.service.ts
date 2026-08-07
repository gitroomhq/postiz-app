import Stripe from 'stripe';
import { Injectable } from '@nestjs/common';
import { Organization, User } from '@prisma/client';
import { SubscriptionService } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.service';
import { OrganizationService } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.service';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import { BillingSubscribeDto } from '@gitroom/nestjs-libraries/dtos/billing/billing.subscribe.dto';
import { groupBy } from 'lodash';
import { isBillingEnabled } from '@gitroom/helpers/utils/billing.enabled';
import {
  LIFETIME_GRANT_TIER,
  LIFETIME_PRICE,
  LIFETIME_RETENTION_PRICE,
  PaidTier,
  pricing,
  trialWindow,
} from '@gitroom/nestjs-libraries/database/prisma/subscriptions/pricing';
import { AuthService } from '@gitroom/helpers/auth/auth.service';
import { NotificationService } from '@gitroom/nestjs-libraries/database/prisma/notifications/notification.service';
import { TrackService } from '@gitroom/nestjs-libraries/track/track.service';
import { UsersService } from '@gitroom/nestjs-libraries/database/prisma/users/users.service';
import { TrackEnum } from '@gitroom/nestjs-libraries/user/track.enum';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_nothing');

/**
 * Stamped on every subscription this app creates. The webhook uses it to ignore
 * events from other integrations that share the same Stripe account, so the
 * value written here and the value accepted there must always agree — if they
 * drift apart, subscription events are silently discarded and nothing errors.
 */
export const SUBSCRIPTION_SERVICE_TAG = 'postqueen';

@Injectable()
export class StripeService {
  constructor(
    private _subscriptionService: SubscriptionService,
    private _organizationService: OrganizationService,
    private _userService: UsersService,
    private _trackService: TrackService,
    // For `paymentFailed` — a failed renewal has to reach the customer, and
    // this is the same service the cancellation email already goes through.
    private _notificationService: NotificationService
  ) {}
  validateRequest(rawBody: Buffer, signature: string, endpointSecret: string) {
    return stripe.webhooks.constructEvent(rawBody, signature, endpointSecret);
  }

  async checkValidCard(
    event:
      | Stripe.CustomerSubscriptionCreatedEvent
      | Stripe.CustomerSubscriptionUpdatedEvent
  ) {
    if (event.data.object.status === 'incomplete') {
      return false;
    }

    const getOrgFromCustomer =
      await this._organizationService.getOrgByCustomerId(
        event.data.object.customer as string
      );

    if (!getOrgFromCustomer?.allowTrial) {
      return true;
    }

    console.log('Checking card');

    const paymentMethods = await stripe.paymentMethods.list({
      customer: event.data.object.customer as string,
    });

    // find the last one created
    const latestMethod = paymentMethods.data.reduce(
      (prev, current) => {
        if (prev.created < current.created) {
          return current;
        }
        return prev;
      },
      { created: -100 } as Stripe.PaymentMethod
    );

    if (!latestMethod.id) {
      return false;
    }

    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: 100,
        currency: 'usd',
        payment_method: latestMethod.id,
        customer: event.data.object.customer as string,
        off_session: true,
        capture_method: 'manual', // Authorize without capturing
        confirm: true, // Confirm the PaymentIntent
      });

      if (paymentIntent.status !== 'requires_capture') {
        console.error('Cant charge');
        await stripe.paymentMethods.detach(paymentMethods.data[0].id);
        await stripe.subscriptions.cancel(event.data.object.id as string);
        return false;
      }

      await stripe.paymentIntents.cancel(paymentIntent.id as string);
      return true;
    } catch (err) {
      try {
        await stripe.paymentMethods.detach(paymentMethods.data[0].id);
        await stripe.subscriptions.cancel(event.data.object.id as string);
      } catch (err) {
        /*dont do anything*/
      }
      return false;
    }
  }

  async createSubscription(event: Stripe.CustomerSubscriptionCreatedEvent) {
    const {
      uniqueId,
      billing,
      period,
    } = event.data.object.metadata as {
      // Stripe hands this back as whatever was written when the subscription
      // was created, so it has to name every tier that can be sold, not the
      // two that could when this was written.
      billing: PaidTier;
      period: 'MONTHLY' | 'YEARLY';
      uniqueId: string;
    };

    try {
      const check = await this.checkValidCard(event);
      if (!check) {
        return { ok: false };
      }
    } catch (err) {
      return { ok: false };
    }

    return this._subscriptionService.createOrUpdateSubscription(
      // This argument is the organization's trial flag, and it used to read
      // `status !== 'active'` — which is true of `past_due`, `unpaid`,
      // `incomplete` and `paused` as well as `trialing`. A test clock caught it:
      // advancing to a renewal the card refused left the subscription
      // `past_due`, and the customer was written back into a **trial they were
      // not on** — re-locking X and putting the trial banner in front of
      // somebody who had been paying for a month. Only one status is a trial.
      event.data.object.status === 'trialing',
      uniqueId,
      event.data.object.customer as string,
      pricing[billing].channel!,
      billing,
      period,
      event.data.object.cancel_at
    );
  }

  async updateSubscription(event: Stripe.CustomerSubscriptionUpdatedEvent) {
    const {
      uniqueId,
      billing,
      period,
    } = event.data.object.metadata as {
      // Stripe hands this back as whatever was written when the subscription
      // was created, so it has to name every tier that can be sold, not the
      // two that could when this was written.
      billing: PaidTier;
      period: 'MONTHLY' | 'YEARLY';
      uniqueId: string;
    };

    const check = await this.checkValidCard(event);
    if (!check) {
      return { ok: false };
    }

    return this._subscriptionService.createOrUpdateSubscription(
      event.data.object.status === 'trialing',
      uniqueId,
      event.data.object.customer as string,
      pricing[billing].channel!,
      billing,
      period,
      event.data.object.cancel_at
    );
  }

  async deleteSubscription(event: Stripe.CustomerSubscriptionDeletedEvent) {
    await this._subscriptionService.deleteSubscription(
      event.data.object.customer as string
    );
  }

  // After a login swap, move each Stripe customer's email to the login that
  // now owns it. Owner-only so a member's switch can't rewrite a shared org's
  // billing email, deduped per customer, and skipping admin-granted
  // subscriptions (their paymentId is a user id, not a `cus_...` customer).
  async syncCustomerEmailsAfterSwitch(
    accounts: { id: string; email: string }[]
  ) {
    if (!process.env.STRIPE_PUBLISHABLE_KEY) {
      return;
    }
    const emailByCustomer = new Map<string, string>();
    for (const account of accounts) {
      const organizations = await this._organizationService.getOrgsByUserId(
        account.id
      );
      for (const org of organizations) {
        if (
          org.users?.[0]?.role === 'SUPERADMIN' &&
          org.paymentId?.startsWith('cus_') &&
          !emailByCustomer.has(org.paymentId)
        ) {
          emailByCustomer.set(org.paymentId, account.email);
        }
      }
    }
    await Promise.all(
      [...emailByCustomer].map(([customerId, email]) =>
        stripe.customers
          .update(customerId, {
            email: email.indexOf('@') > -1 ? email : `${email}@postqueen.ai`,
          })
          .catch(() => {})
      )
    );
  }

  async createOrGetCustomer(organization: Organization) {
    if (organization.paymentId) {
      return organization.paymentId;
    }

    const users = await this._organizationService.getTeam(organization.id);
    const customer = await stripe.customers.create({
      email: users.users[0].user.email.indexOf('@') > -1 ? users.users[0].user.email : `${users.users[0].user.email}@no-reply.invalid`,
      name: organization.name,
    });
    await this._subscriptionService.updateCustomerId(
      organization.id,
      customer.id
    );
    return customer.id;
  }

  async getPackages() {
    // A self-hosted install has no key, so line 19 hands Stripe the string
    // 'sk_nothing' and this call comes back 401. That 401 is not harmless: the
    // frontend treats any 401 as an expired session, clears the auth cookie and
    // sends the browser to the login page — so opening /billing on an install
    // with billing switched off *signs the user out*. Billing is hidden from
    // the navigation there, but the route is still reachable by URL.
    //
    // There are no packages to list when nobody can buy one, so say that
    // instead of asking Stripe.
    if (!isBillingEnabled()) {
      return {};
    }

    const products = await stripe.prices.list({
      active: true,
      expand: ['data.tiers', 'data.product'],
      // Built from the tiers actually on sale rather than a hardcoded list.
      // It asked for `standard_monthly` and `standard_yearly` until now —
      // STANDARD was retired by the rename, so two of the four keys named a
      // plan nobody can buy, and nothing noticed because this endpoint returns
      // whatever it finds.
      lookup_keys: Object.entries(pricing)
        .filter(([name, plan]) => name !== 'FREE' && !plan.retired)
        .flatMap(([name]) => [
          `${name.toLowerCase()}_monthly`,
          `${name.toLowerCase()}_yearly`,
        ]),
    });

    const productsList = groupBy(
      products.data.map((p) => ({
        name: (p.product as Stripe.Product)?.name,
        recurring: p?.recurring?.interval!,
        // Tiered prices keep the amount on the first tier; a flat price keeps
        // it on the price itself. This read only handled the first, so an
        // ordinary flat price came back with no amount at all — which is what
        // the whole packages list did until the fixtures exposed it.
        price: (p?.tiers?.[0]?.unit_amount ?? p?.unit_amount ?? 0) / 100,
      })),
      'recurring'
    );

    return { ...productsList };
  }

  async prorate(organizationId: string, body: BillingSubscribeDto) {
    const org = await this._organizationService.getOrgById(organizationId);
    const customer = await this.createOrGetCustomer(org!);
    const priceData = pricing[body.billing];
    const allProducts = await stripe.products.list({
      active: true,
      expand: ['data.prices'],
    });

    const findProduct =
      allProducts.data.find(
        (product) => product.name.toUpperCase() === body.billing.toUpperCase()
      ) ||
      (await stripe.products.create({
        active: true,
        name: body.billing,
        // Cloud software, business use. Stripe Tax needs this to pick the right
        // treatment per jurisdiction; the generic services code under-collects.
        tax_code: 'txcd_10103001',
      }));

    const pricesList = await stripe.prices.list({
      active: true,
      product: findProduct!.id,
    });

    const findPrice =
      pricesList.data.find(
        (p) =>
          p?.tax_behavior === 'exclusive' &&
          p?.recurring?.interval?.toLowerCase() ===
            (body.period === 'MONTHLY' ? 'month' : 'year') &&
          p?.nickname === body.billing + ' ' + body.period &&
          p?.unit_amount ===
            (body.period === 'MONTHLY'
              ? priceData.month_price
              : priceData.year_price) *
              100
      ) ||
      (await stripe.prices.create({
        active: true,
        product: findProduct!.id,
        currency: 'usd',
        nickname: body.billing + ' ' + body.period,
        unit_amount:
          (body.period === 'MONTHLY'
            ? priceData.month_price
            : priceData.year_price) * 100,
        // Listed prices are pre-tax; automatic_tax adds it on top. A price with
        // no tax_behavior makes Checkout fail once automatic tax is enabled.
        tax_behavior: 'exclusive',
        recurring: {
          interval: body.period === 'MONTHLY' ? 'month' : 'year',
        },
      }));

    const currentUserSubscription = {
      data: (
        await stripe.subscriptions.list({
          customer,
          status: 'all',
        })
      ).data.filter((f) => f.status === 'active' || f.status === 'trialing'),
    };

    try {
      const price = await stripe.invoices.createPreview({
        customer,
        subscription: currentUserSubscription?.data?.[0]?.id,
        subscription_details: {
          proration_behavior: 'create_prorations',
          // `proration_date` used to be passed here as well. Stripe rejects the
          // pair — "You cannot specify `proration_date` when
          // `billing_cycle_anchor=now`" — so **every** call threw, the catch
          // below swallowed it, and the plan cards told everyone that every
          // upgrade cost "(Pay Today $0)". Anchoring to now already means the
          // proration is calculated at this moment; the date was redundant as
          // well as fatal.
          billing_cycle_anchor: 'now',
          items: [
            {
              id: currentUserSubscription?.data?.[0]?.items?.data?.[0]?.id,
              price: findPrice?.id!,
              quantity: 1,
            },
          ],
        },
      });

      return {
        price: price?.amount_remaining ? price?.amount_remaining / 100 : 0,
      };
    } catch (err) {
      // Kept, so a Stripe outage cannot take the Billing screen down with it —
      // but it is no longer hiding a permanent failure.
      return { price: 0 };
    }
  }

  async getCustomerSubscriptions(organizationId: string) {
    const org = (await this._organizationService.getOrgById(organizationId))!;
    const customer = org.paymentId;
    return stripe.subscriptions.list({
      customer: customer!,
      status: 'all',
    });
  }

  async setToCancel(organizationId: string) {
    const id = makeId(10);
    const org = await this._organizationService.getOrgById(organizationId);
    const customer = await this.createOrGetCustomer(org!);
    const localSub =
      await this._subscriptionService.getSubscriptionByOrganizationId(
        organizationId
      );

    // Founding-member trial is a local row (often with no Stripe subscription).
    // The Plans cancel copy promises an immediate return to FREE — honour that
    // instead of reporting success while leaving `isLifetime` intact.
    if (localSub?.isLifetime && org?.isTrailing) {
      await this.cancelOpenStripeSubscriptions(customer);
      await this._subscriptionService.revokeLocalSubscription(organizationId);
      await this._organizationService.endTrial(organizationId);
      return {
        id,
        cancel_at: new Date(),
      };
    }

    const currentUserSubscription = {
      data: (
        await stripe.subscriptions.list({
          customer,
          status: 'all',
          expand: ['data.latest_invoice'],
        })
      ).data.filter((f) => f.status !== 'canceled'),
    };

    const sub = currentUserSubscription.data[0];

    // Nothing left to cancel — a retry of a cancel that already went through.
    // Report it as cancelled rather than throwing; the outcome the caller
    // asked for is already true.
    if (!sub) {
      return {
        id,
        cancel_at: new Date(),
      };
    }

    // If the user is toggling back (un-cancelling), just remove the cancel
    if (sub.cancel_at_period_end) {
      const { cancel_at } = await stripe.subscriptions.update(sub.id, {
        cancel_at_period_end: false,
        metadata: { service: SUBSCRIPTION_SERVICE_TAG, id },
      });

      return {
        id,
        cancel_at: cancel_at ? new Date(cancel_at * 1000) : undefined,
      };
    }

    // Check if the latest invoice has a failed payment
    const latestInvoice = sub.latest_invoice as Stripe.Invoice | null;
    const hasFailedPayment =
      sub.status === 'past_due' ||
      latestInvoice?.status === 'open' ||
      latestInvoice?.status === 'uncollectible';

    if (hasFailedPayment) {
      // Payment already failed — cancel immediately and delete subscription
      await stripe.subscriptions.cancel(sub.id);
      await this._subscriptionService.deleteSubscription(customer);

      return {
        id,
        cancel_at: new Date(),
      };
    }

    // Payment succeeded — cancel at end of billing period
    const { cancel_at } = await stripe.subscriptions.update(sub.id, {
      cancel_at_period_end: true,
      metadata: { service: SUBSCRIPTION_SERVICE_TAG, id },
    });

    return {
      id,
      cancel_at: cancel_at ? new Date(cancel_at * 1000) : undefined,
    };
  }

  /**
   * Cancel every non-canceled Stripe subscription on a customer.
   * Used when converting to lifetime so the recurring sub cannot also bill.
   */
  private async cancelOpenStripeSubscriptions(customer: string) {
    const list = await stripe.subscriptions.list({
      customer,
      status: 'all',
    });
    for (const sub of list.data.filter((f) => f.status !== 'canceled')) {
      await stripe.subscriptions.cancel(sub.id);
    }
  }

  async getCustomerByOrganizationId(organizationId: string) {
    const org = (await this._organizationService.getOrgById(organizationId))!;
    return org.paymentId;
  }

  async createBillingPortalLink(customer: string) {
    return stripe.billingPortal.sessions.create({
      customer,
      return_url: process.env['FRONTEND_URL'] + '/billing',
    });
  }

  /**
   * Find an active promotion code with autoapply: true metadata
   * Only returns codes that are active and not expired
   * Returns the promotion code string (not the ID) for frontend auto-apply
   */
  private async findAutoApplyPromotionCode(): Promise<string | null> {
    try {
      const promotionCodes = await stripe.promotionCodes.list({
        active: true,
        limit: 100,
      });

      const now = Math.floor(Date.now() / 1000);

      for (const promoCode of promotionCodes.data) {
        const coupon =
          typeof promoCode.promotion.coupon === 'string'
            ? null
            : promoCode.promotion.coupon;

        // Check if it has autoapply metadata set to true (check both promo and coupon metadata)
        const autoApply = Object.assign(
          {},
          promoCode.metadata,
          coupon?.metadata
        )?.autoapply;
        if (autoApply !== 'true') continue;

        // Check if the promotion code has expired
        if (promoCode.expires_at && promoCode.expires_at < now) continue;

        // Check if the coupon has expired (redeem_by)
        if (coupon?.redeem_by && coupon.redeem_by < now) continue;

        // Check if max redemptions reached
        if (
          promoCode.max_redemptions &&
          promoCode.times_redeemed >= promoCode.max_redemptions
        )
          continue;

        // Found a valid auto-apply promotion code - return the code string for frontend
        return promoCode.code;
      }

      return null;
    } catch (err) {
      console.error('Error finding auto-apply promotion code:', err);
      return null;
    }
  }

  private async createEmbeddedCheckout(
    ud: string,
    uniqueId: string,
    customer: string,
    body: BillingSubscribeDto,
    price: string,
    userId: string,
    allowTrial: boolean
  ) {
    const user = await this._userService.getUserById(userId);

    try {
      await stripe.customers.update(customer, {
        email: user.email.indexOf('@') > -1 ? user.email : `${user.email}@no-reply.invalid`,
        ...(body.dub
          ? {
              metadata: {
                dubCustomerExternalId: userId,
                dubClickId: body.dub,
              },
            }
          : {}),
      });
    } catch (err) {}

    // Check for auto-apply promotion code (only for monthly plans)
    let autoApplyPromoCode: string | null = null;
    if (body.period === 'MONTHLY') {
      autoApplyPromoCode = await this.findAutoApplyPromotionCode();
    }

    const isUtm = body.utm ? `&utm_source=${body.utm}` : '';
    const { client_secret } = await stripe.checkout.sessions.create({
      ui_mode: 'custom',
      customer,
      return_url:
        process.env['FRONTEND_URL'] +
        `/launches?onboarding=true&trialStart=true&check=${uniqueId}${isUtm}`,
      mode: 'subscription',
      // Tax needs a location. The customer already exists, so customer_update
      // tells Checkout to write the collected billing address back to it.
      automatic_tax: { enabled: true },
      customer_update: { address: 'auto' },
      billing_address_collection: 'required',
      subscription_data: {
        ...(allowTrial ? { trial_period_days: 7 } : {}),
        metadata: {
          service: SUBSCRIPTION_SERVICE_TAG,
          ...body,
          userId,
          uniqueId,
          ud,
        },
      },
      ...(body.datafast_session_id && body.datafast_visitor_id
        ? {
            metadata: {
              datafast_visitor_id: body.datafast_visitor_id,
              datafast_session_id: body.datafast_session_id,
            },
          }
        : {}),
      // Yearly and monthly both accept promotion codes (checkout fidelity).
      allow_promotion_codes: true,
      line_items: [
        {
          price,
          quantity: 1,
        },
      ],
    });

    // Return auto-apply promo code for frontend to apply
    return {
      client_secret,
      ...(autoApplyPromoCode ? { auto_apply_coupon: autoApplyPromoCode } : {}),
    };
  }

  private async createCheckoutSession(
    ud: string,
    uniqueId: string,
    customer: string,
    body: BillingSubscribeDto,
    price: string,
    userId: string,
    allowTrial: boolean
  ) {
    const isUtm = body.utm ? `&utm_source=${body.utm}` : '';

    if (body.dub) {
      await stripe.customers.update(customer, {
        metadata: {
          dubCustomerExternalId: userId,
          dubClickId: body.dub,
        },
      });
    }

    const { url } = await stripe.checkout.sessions.create({
      customer,
      cancel_url: process.env['FRONTEND_URL'] + `/billing?cancel=true${isUtm}`,
      success_url:
        process.env['FRONTEND_URL'] +
        `/launches?onboarding=true&trialStart=true&check=${uniqueId}${isUtm}`,
      mode: 'subscription',
      automatic_tax: { enabled: true },
      customer_update: { address: 'auto' },
      billing_address_collection: 'required',
      subscription_data: {
        ...(allowTrial ? { trial_period_days: 7 } : {}),
        metadata: {
          service: SUBSCRIPTION_SERVICE_TAG,
          ...body,
          userId,
          uniqueId,
          ud,
        },
      },
      allow_promotion_codes: true,
      line_items: [
        {
          price,
          quantity: 1,
        },
      ],
    });

    return { url };
  }

  /**
   * Ends a Stripe trial early, and says whether there was one.
   *
   * It used to index `list[0].id` unconditionally, which throws when the
   * customer has no trialing subscription — and a founding member has none at
   * all, because a lifetime entitlement is a local row rather than a Stripe
   * subscription. The controller swallowed the throw and reported success, so
   * the caller polled `is-trial-finished` forever against a flag nothing had
   * cleared. The spinner never stopped.
   *
   * `ended: false` is not a failure. It means Stripe had nothing to end, which
   * the caller needs in order to finish the job locally. An actual error still
   * throws, because "the API call failed" and "there was no trial" must not
   * look the same to whoever decides to clear somebody's trial flag.
   */
  async finishTrial(paymentId: string) {
    if (!paymentId) {
      return { ended: false };
    }

    const list = (
      await stripe.subscriptions.list({
        customer: paymentId,
      })
    ).data.filter((f) => f.status === 'trialing');

    if (!list.length) {
      return { ended: false };
    }

    await stripe.subscriptions.update(list[0].id, {
      trial_end: 'now',
    });

    return { ended: true };
  }

  /**
   * The discount currently running on a subscription, if any.
   *
   * `applyDiscount` puts the retention coupon on the Stripe subscription and
   * nothing read it back, so somebody who accepted 50% off saw a toast and then
   * a Billing screen that looked exactly as it had a moment earlier. Doc 03
   * calls for "a visible active-discount state on Billing"; this is what the
   * banner is drawn from.
   *
   * Returns null rather than throwing when billing is off or the customer has
   * no subscription — the Billing screen must render either way.
   */
  async getActiveDiscount(customer?: string | null) {
    if (!isBillingEnabled() || !customer) {
      return null;
    }

    try {
      const subscription = (
        await stripe.subscriptions.list({
          customer,
          status: 'all',
          expand: ['data.discounts'],
        })
      ).data.find((f) => f.status === 'active' || f.status === 'trialing');

      const discount = subscription?.discounts?.[0];
      if (!discount || typeof discount === 'string') {
        return null;
      }

      // The coupon hangs off `source` in this API version, and expansion only
      // reaches one level in — so it arrives as an id about as often as an
      // object, and both have to be handled.
      const source = discount.source?.coupon;
      const coupon =
        typeof source === 'string' ? await stripe.coupons.retrieve(source) : source;

      const percentOff = coupon?.percent_off ?? null;
      if (!percentOff) {
        return null;
      }

      return {
        percentOff,
        // Stripe reports the end of a repeating coupon as a timestamp; a
        // `forever` one has none, and the banner says so by leaving it out.
        endsAt: discount.end ? new Date(discount.end * 1000).toISOString() : null,
        months: coupon?.duration_in_months ?? null,
      };
    } catch (err) {
      return null;
    }
  }

  async checkDiscount(customer: string) {
    if (!process.env.STRIPE_DISCOUNT_ID) {
      return false;
    }

    // Monthly active|trialing only — no prior-charge gate so normal trials can
    // see the 50%×3 retention offer (trials usually have no paid charge yet).
    const currentUserSubscription = (
      await stripe.subscriptions.list({
        customer,
        status: 'all',
        expand: ['data.discounts'],
      })
    ).data.find((f) => f.status === 'active' || f.status === 'trialing');

    if (!currentUserSubscription) {
      return false;
    }

    if (
      currentUserSubscription.items.data[0]?.price.recurring?.interval ===
        'year' ||
      currentUserSubscription.discounts.length
    ) {
      return false;
    }

    return true;
  }

  async applyDiscount(customer: string) {
    const check = await this.checkDiscount(customer);
    if (!check) {
      return false;
    }

    const currentUserSubscription = (
      await stripe.subscriptions.list({
        customer,
        status: 'all',
        expand: ['data.discounts'],
      })
    ).data.find((f) => f.status === 'active' || f.status === 'trialing');

    if (!currentUserSubscription) {
      return false;
    }

    await stripe.subscriptions.update(currentUserSubscription.id, {
      discounts: [
        {
          coupon: process.env.STRIPE_DISCOUNT_ID!,
        },
      ],
    });

    return true;
  }

  async checkSubscription(organizationId: string, subscriptionId: string) {
    const orgValue = await this._subscriptionService.checkSubscription(
      organizationId,
      subscriptionId
    );

    if (orgValue) {
      return 2;
    }

    const getCustomerSubscriptions = await this.getCustomerSubscriptions(
      organizationId
    );
    if (getCustomerSubscriptions.data.length === 0) {
      return 0;
    }

    if (
      getCustomerSubscriptions.data.find(
        (p) => p.metadata.uniqueId === subscriptionId
      )?.canceled_at
    ) {
      return 1;
    }

    return 0;
  }

  async embedded(
    uniqueId: string,
    organizationId: string,
    userId: string,
    body: BillingSubscribeDto,
    allowTrial: boolean
  ) {
    // First-run checkout only. Without this, an org that already pays could
    // reach it again (direct POST, or a stale render that still thinks the tier
    // is FREE) and Stripe would create a *second* subscription on the same
    // customer, billing both. The Subscription row is unique per organization,
    // so it would only ever show whichever webhook landed last, and cancelling
    // acts on one subscription — leaving the other charging invisibly.
    // Plan changes belong to subscribe(), which updates in place.
    const existingSubscription =
      await this._subscriptionService.getSubscription(organizationId);

    if (existingSubscription) {
      throw new Error('This organization already has an active subscription');
    }

    const id = makeId(10);
    const priceData = pricing[body.billing];
    const org = await this._organizationService.getOrgById(organizationId);
    const customer = await this.createOrGetCustomer(org!);
    const allProducts = await stripe.products.list({
      active: true,
      expand: ['data.prices'],
    });

    const findProduct =
      allProducts.data.find(
        (product) => product.name.toUpperCase() === body.billing.toUpperCase()
      ) ||
      (await stripe.products.create({
        active: true,
        name: body.billing,
        // Cloud software, business use. Stripe Tax needs this to pick the right
        // treatment per jurisdiction; the generic services code under-collects.
        tax_code: 'txcd_10103001',
      }));

    const pricesList = await stripe.prices.list({
      active: true,
      product: findProduct!.id,
    });

    const findPrice =
      pricesList.data.find(
        (p) =>
          p?.tax_behavior === 'exclusive' &&
          p?.recurring?.interval?.toLowerCase() ===
            (body.period === 'MONTHLY' ? 'month' : 'year') &&
          p?.unit_amount ===
            (body.period === 'MONTHLY'
              ? priceData.month_price
              : priceData.year_price) *
              100
      ) ||
      (await stripe.prices.create({
        active: true,
        product: findProduct!.id,
        currency: 'usd',
        nickname: body.billing + ' ' + body.period,
        unit_amount:
          (body.period === 'MONTHLY'
            ? priceData.month_price
            : priceData.year_price) * 100,
        // Listed prices are pre-tax; automatic_tax adds it on top. A price with
        // no tax_behavior makes Checkout fail once automatic tax is enabled.
        tax_behavior: 'exclusive',
        recurring: {
          interval: body.period === 'MONTHLY' ? 'month' : 'year',
        },
      }));

    return this.createEmbeddedCheckout(
      uniqueId,
      id,
      customer,
      body,
      findPrice!.id,
      userId,
      allowTrial
    );
  }

  async subscribe(
    uniqueId: string,
    organizationId: string,
    userId: string,
    body: BillingSubscribeDto,
    allowTrial: boolean
  ) {
    const id = makeId(10);
    const priceData = pricing[body.billing];
    const org = await this._organizationService.getOrgById(organizationId);
    const customer = await this.createOrGetCustomer(org!);
    const allProducts = await stripe.products.list({
      active: true,
      expand: ['data.prices'],
    });

    const findProduct =
      allProducts.data.find(
        (product) => product.name.toUpperCase() === body.billing.toUpperCase()
      ) ||
      (await stripe.products.create({
        active: true,
        name: body.billing,
        // Cloud software, business use. Stripe Tax needs this to pick the right
        // treatment per jurisdiction; the generic services code under-collects.
        tax_code: 'txcd_10103001',
      }));

    const pricesList = await stripe.prices.list({
      active: true,
      product: findProduct!.id,
    });

    const findPrice =
      pricesList.data.find(
        (p) =>
          p?.tax_behavior === 'exclusive' &&
          p?.recurring?.interval?.toLowerCase() ===
            (body.period === 'MONTHLY' ? 'month' : 'year') &&
          p?.unit_amount ===
            (body.period === 'MONTHLY'
              ? priceData.month_price
              : priceData.year_price) *
              100
      ) ||
      (await stripe.prices.create({
        active: true,
        product: findProduct!.id,
        currency: 'usd',
        nickname: body.billing + ' ' + body.period,
        unit_amount:
          (body.period === 'MONTHLY'
            ? priceData.month_price
            : priceData.year_price) * 100,
        // Listed prices are pre-tax; automatic_tax adds it on top. A price with
        // no tax_behavior makes Checkout fail once automatic tax is enabled.
        tax_behavior: 'exclusive',
        recurring: {
          interval: body.period === 'MONTHLY' ? 'month' : 'year',
        },
      }));

    const getCurrentSubscriptions =
      await this._subscriptionService.getSubscription(organizationId);

    if (!getCurrentSubscriptions) {
      return this.createCheckoutSession(
        uniqueId,
        id,
        customer,
        body,
        findPrice!.id,
        userId,
        allowTrial
      );
    }

    const currentUserSubscription = {
      data: (
        await stripe.subscriptions.list({
          customer,
          status: 'all',
        })
      ).data.filter((f) => f.status === 'active' || f.status === 'trialing'),
    };

    try {
      await stripe.subscriptions.update(currentUserSubscription.data[0].id, {
        cancel_at_period_end: false,
        metadata: {
          service: SUBSCRIPTION_SERVICE_TAG,
          ...body,
          userId,
          id,
          ud: uniqueId,
        },
        proration_behavior: 'always_invoice',
        items: [
          {
            id: currentUserSubscription.data[0].items.data[0].id,
            price: findPrice!.id,
            quantity: 1,
          },
        ],
      });

      return { id };
    } catch (err) {
      const { url } = await this.createBillingPortalLink(customer);
      return {
        portal: url,
      };
    }
  }

  async paymentSucceeded(event: Stripe.InvoicePaymentSucceededEvent) {
    // get subscription from payment
    const subscriptionId =
      event.data.object.parent?.subscription_details?.subscription;
    if (!subscriptionId) {
      return { ok: true };
    }
    const subscription = await stripe.subscriptions.retrieve(
      typeof subscriptionId === 'string' ? subscriptionId : subscriptionId.id
    );

    const { userId, ud } = subscription.metadata;
    const user = await this._userService.getUserById(userId);
    if (user && user.ip && user.agent) {
      this._trackService.track(ud, user.ip, user.agent, TrackEnum.Purchase, {
        value: event.data.object.amount_paid / 100,
      });
    }

    return { ok: true };
  }

  /**
   * A renewal Stripe could not charge.
   *
   * Nothing handled this before, so the customer's first sign that anything was
   * wrong was the app dropping to the paywall weeks later, when Stripe gave up
   * retrying and cancelled the subscription. Now they are told, and the Billing
   * screen has something to draw (`hasFailedPayment` below).
   *
   * Deliberately does not touch the subscription: Stripe retries a failed
   * invoice on its own schedule and most of them succeed on the second attempt.
   * Cancelling here would take the plan away from somebody whose bank simply
   * asked for a confirmation.
   */
  async paymentFailed(event: Stripe.InvoicePaymentFailedEvent) {
    const customer = event.data.object.customer as string;
    if (!customer) {
      return { ok: true };
    }

    const org = await this._organizationService.getOrgByCustomerId(customer);
    if (!org) {
      return { ok: true };
    }

    await this._notificationService.inAppNotification(
      org.id,
      'Payment failed',
      "We could not charge your card for PostQueen. Update your payment method from Billing and we'll try again — nothing is cancelled yet.",
      true
    );

    return { ok: true };
  }

  /**
   * Whether the most recent invoice on this customer failed to be paid.
   *
   * Read from Stripe rather than stored, for the same reason the active
   * discount is: the fact lives there, and a copy here is a copy that goes
   * stale the moment Stripe's own retry succeeds.
   */
  async hasFailedPayment(customer?: string | null) {
    if (!isBillingEnabled() || !customer) {
      return false;
    }

    try {
      const invoices = await stripe.invoices.list({ customer, limit: 1 });
      const latest = invoices.data[0];
      return latest?.status === 'open' && (latest?.attempt_count ?? 0) > 0;
    } catch (err) {
      return false;
    }
  }

  async getCharges(organizationId: string) {
    const org = await this._organizationService.getOrgById(organizationId);
    if (!org?.paymentId) {
      return [];
    }

    const charges = await stripe.charges.list({
      customer: org.paymentId,
      limit: 100,
    });

    const chargeList = charges.data
      .filter((f) => f.status === 'succeeded')
      .map((charge) => ({
        id: charge.id,
        amount: charge.amount,
        currency: charge.currency,
        created: charge.created,
        status: charge.status,
        refunded: charge.refunded,
        amount_refunded: charge.amount_refunded,
        description: charge.description,
        receipt_url: charge.receipt_url || null,
        invoice: (charge as any).invoice || null,
      }));

    const invoiceIds = chargeList
      .map((c) => c.invoice)
      .filter((id): id is string => !!id && typeof id === 'string');

    const invoicePdfMap: Record<string, string> = {};
    for (const invoiceId of invoiceIds) {
      try {
        const inv = await stripe.invoices.retrieve(invoiceId);
        if (inv.invoice_pdf) {
          invoicePdfMap[invoiceId] = inv.invoice_pdf;
        }
      } catch {
        // ignore if invoice can't be fetched
      }
    }

    return chargeList.map((charge) => ({
      ...charge,
      invoice_pdf:
        charge.invoice && invoicePdfMap[charge.invoice as string]
          ? invoicePdfMap[charge.invoice as string]
          : null,
    }));
  }

  async refundCharges(organizationId: string, chargeIds: string[]) {
    const org = await this._organizationService.getOrgById(organizationId);
    if (!org?.paymentId) {
      throw new Error('No payment customer found for this organization');
    }

    const refunded: string[] = [];
    const failed: string[] = [];

    for (const chargeId of chargeIds) {
      try {
        await stripe.refunds.create({ charge: chargeId });
        refunded.push(chargeId);
      } catch (err) {
        failed.push(chargeId);
      }
    }

    return { refunded, failed };
  }

  async cancelSubscription(organizationId: string) {
    const org = await this._organizationService.getOrgById(organizationId);
    if (!org?.paymentId) {
      throw new Error('No payment customer found for this organization');
    }

    const customer = org.paymentId;

    const subscriptions = (
      await stripe.subscriptions.list({
        customer,
        status: 'all',
      })
    ).data.filter((f) => f.status !== 'canceled');

    if (!subscriptions.length) {
      throw new Error('No active subscription found');
    }

    await stripe.subscriptions.cancel(subscriptions[0].id);
    await this._subscriptionService.deleteSubscription(customer);

    return { cancelled: true };
  }

  async chatbaseRefundPreview(organizationId: string) {
    const org = await this._organizationService.getOrgById(organizationId);
    if (!org?.paymentId) {
      return {
        eligible: false as const,
        reason: 'No payment customer found for this organization',
      };
    }

    const customer = org.paymentId;

    const subscriptions = (
      await stripe.subscriptions.list({
        customer,
        status: 'all',
      })
    ).data.filter((f) => f.status !== 'canceled');

    if (!subscriptions.length) {
      return {
        eligible: false as const,
        reason: 'No active subscription found for this customer',
      };
    }

    const charges = (
      await stripe.charges.list({
        customer,
        limit: 100,
      })
    ).data.filter((f) => f.status === 'succeeded');

    if (charges.some((f) => f.refunded || f.amount_refunded > 0)) {
      return {
        eligible: false as const,
        reason: 'A refund was already issued for this customer',
      };
    }

    // only refund a charge that was created by the active subscription,
    // never a one-off payment
    let lastCharge: (typeof charges)[number] | undefined = undefined;
    let chargeSubscription: (typeof subscriptions)[number] | undefined =
      undefined;

    for (const charge of charges) {
      const invoiceId = (charge as any).invoice;
      if (!invoiceId || typeof invoiceId !== 'string') {
        continue;
      }

      try {
        const invoice = await stripe.invoices.retrieve(invoiceId);
        const invoiceSubscription =
          invoice.parent?.subscription_details?.subscription;
        const subscriptionId =
          typeof invoiceSubscription === 'string'
            ? invoiceSubscription
            : invoiceSubscription?.id;

        chargeSubscription = subscriptions.find(
          (f) => f.id === subscriptionId
        );

        if (chargeSubscription) {
          lastCharge = charge;
          break;
        }
      } catch {
        // ignore if invoice can't be fetched
      }
    }

    if (!lastCharge || !chargeSubscription) {
      return {
        eligible: false as const,
        reason: 'No subscription payment found for this customer',
      };
    }

    const sixtyDaysAgo = Math.floor(Date.now() / 1000) - 60 * 24 * 60 * 60;
    if (lastCharge.created < sixtyDaysAgo) {
      return {
        eligible: false as const,
        reason: 'The last subscription payment is older than 60 days',
      };
    }

    const interval =
      chargeSubscription.items?.data?.[0]?.price?.recurring?.interval;

    // maximum refund is one month worth of the subscription
    const amount =
      interval === 'year'
        ? Math.floor(lastCharge.amount / 12)
        : lastCharge.amount;

    const currentSubscription =
      await this._subscriptionService.getSubscriptionByOrganizationId(
        organizationId
      );

    return {
      eligible: true as const,
      chargeId: lastCharge.id,
      amount: amount / 100,
      currency: lastCharge.currency,
      tier: currentSubscription?.subscriptionTier || null,
      period: currentSubscription?.period || null,
      subscriptionIds: subscriptions.map((f) => f.id),
    };
  }

  async chatbaseRefund(organizationId: string) {
    const preview = await this.chatbaseRefundPreview(organizationId);
    if (!preview.eligible) {
      return {
        refunded: false,
        reason: preview.reason,
      };
    }

    const org = await this._organizationService.getOrgById(organizationId);

    await stripe.refunds.create({
      charge: preview.chargeId,
      amount: Math.round(preview.amount * 100),
      metadata: {
        reason: 'chatbase_refund',
        organizationId,
      },
    });

    for (const subscriptionId of preview.subscriptionIds) {
      await stripe.subscriptions.cancel(subscriptionId);
    }

    if (preview.subscriptionIds.length) {
      await this._subscriptionService.deleteSubscription(org?.paymentId!);
    }

    return {
      refunded: true,
      amount: preview.amount,
      currency: preview.currency,
      subscriptionCancelled: preview.subscriptionIds.length > 0,
    };
  }

  /**
   * A founding-member checkout session.
   *
   * When the org is trial-eligible (`allowTrial`), use `mode: 'setup'` so we
   * collect a card without charging today — `$0 due today` on the paywall must
   * match money. The founding fee is captured later via
   * `captureFoundingLifetimeIfDue` (finish-trial or trial window closed).
   *
   * When not trial-eligible, keep `mode: 'payment'` and charge `LIFETIME_PRICE`
   * immediately (lapsed / returning purchasers).
   *
   * Session metadata carries `service` (webhook filter) and `organizationId`.
   * Deferred sessions also set `lifetime_deferred: '1'`.
   */
  async createLifetimeCheckout(organization: Organization) {
    const customer = await this.createOrGetCustomer(organization);
    // Mid-trial converts are usually past `allowTrial` (trial already started).
    // Defer the $49 charge until trial end whenever the org is still trailing.
    const deferCharge =
      !!organization.isTrailing || !!organization.allowTrial;
    const urls = {
      cancel_url: process.env['FRONTEND_URL'] + '/billing/lifetime?cancel=true',
      success_url:
        process.env['FRONTEND_URL'] + '/billing/lifetime?purchased=true',
    };

    if (deferCharge) {
      const { url } = await stripe.checkout.sessions.create({
        customer,
        mode: 'setup',
        currency: 'usd',
        payment_method_types: ['card'],
        ...urls,
        billing_address_collection: 'required',
        customer_update: { address: 'auto' },
        metadata: {
          service: SUBSCRIPTION_SERVICE_TAG,
          organizationId: organization.id,
          lifetime_deferred: '1',
        },
      });
      return { url };
    }

    const { url } = await stripe.checkout.sessions.create({
      customer,
      mode: 'payment',
      ...urls,
      automatic_tax: { enabled: true },
      customer_update: { address: 'auto' },
      billing_address_collection: 'required',
      allow_promotion_codes: true,
      metadata: {
        service: SUBSCRIPTION_SERVICE_TAG,
        organizationId: organization.id,
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: LIFETIME_PRICE * 100,
            product_data: {
              name: 'PostQueen — founding member',
              description:
                'One payment. Your plan stays unlocked with nothing to renew.',
            },
          },
        },
      ],
    });

    return { url };
  }

  /**
   * After a deferred (setup) founding checkout: attach the payment method as
   * the customer default, then grant lifetime while the trial is still running.
   * Money is not taken here — `captureFoundingLifetimeIfDue` does that later.
   */
  async completeDeferredLifetimeSetup(
    organizationId: string,
    session: {
      id: string;
      customer?: string | { id?: string } | null;
      setup_intent?: string | { id?: string } | null;
    }
  ) {
    const setupIntentId =
      typeof session.setup_intent === 'string'
        ? session.setup_intent
        : session.setup_intent?.id;
    if (!setupIntentId) {
      throw new Error('lifetime setup session missing setup_intent');
    }

    const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
    const paymentMethodId =
      typeof setupIntent.payment_method === 'string'
        ? setupIntent.payment_method
        : setupIntent.payment_method?.id;
    const customerId =
      (typeof session.customer === 'string'
        ? session.customer
        : session.customer?.id) ||
      (typeof setupIntent.customer === 'string'
        ? setupIntent.customer
        : setupIntent.customer?.id);

    if (customerId && paymentMethodId) {
      await stripe.customers.update(customerId, {
        invoice_settings: { default_payment_method: paymentMethodId },
      });
    }

    return this.grantLifetimeFromPayment(
      organizationId,
      `lifetime-setup:${session.id}`
    );
  }

  /**
   * Charge the founding-member fee once when a deferred lifetime purchase's
   * trial ends (button or window). No-ops for code redemption, immediate
   * payment checkouts, or orgs already charged.
   *
   * `force: true` — finish-trial (early end while window still open).
   * `force: false` (default) — only charge once the trial window has closed.
   */
  /**
   * Deferred founding checkout (`lifetime-setup:`) that has not yet recorded a
   * charge (`lifetime-charge:` / immediate `cs_`). Used by FinishTrial polling
   * and `/user/self` lock-until-paid — does not talk to Stripe.
   */
  async isDeferredFoundingFeeOwed(organizationId: string): Promise<boolean> {
    const subscription =
      await this._subscriptionService.getSubscriptionByOrganizationId(
        organizationId
      );
    if (!subscription?.isLifetime) {
      return false;
    }
    const codes = await this._subscriptionService.getCodesByOrgId(
      organizationId
    );
    const codeList = codes.map((c) => c.code);
    const hasDeferred = codeList.some((c) => c.startsWith('lifetime-setup:'));
    const alreadyPaid =
      codeList.some((c) => c.startsWith('lifetime-charge:')) ||
      codeList.some((c) => c.startsWith('lifetime-retention:')) ||
      codeList.some((c) => /^cs_/.test(c));
    return hasDeferred && !alreadyPaid;
  }

  async captureFoundingLifetimeIfDue(
    organizationId: string,
    opts: { force?: boolean } = {}
  ) {
    const org = await this._organizationService.getOrgById(organizationId);
    if (!org?.paymentId) {
      return { charged: false };
    }

    if (!(await this.isDeferredFoundingFeeOwed(organizationId))) {
      return { charged: false };
    }

    const windowOpen = trialWindow(org.createdAt).open;
    if (windowOpen && !opts.force) {
      return { charged: false };
    }

    const customer = await stripe.customers.retrieve(org.paymentId);
    if ((customer as { deleted?: boolean }).deleted) {
      return { charged: false };
    }
    const live = customer as Stripe.Customer;
    const defaultPm =
      typeof live.invoice_settings?.default_payment_method === 'string'
        ? live.invoice_settings.default_payment_method
        : live.invoice_settings?.default_payment_method?.id;

    if (!defaultPm) {
      return { charged: false, error: 'no_payment_method' };
    }

    try {
      const pi = await stripe.paymentIntents.create(
        {
          amount: LIFETIME_PRICE * 100,
          currency: 'usd',
          customer: org.paymentId,
          payment_method: defaultPm,
          off_session: true,
          confirm: true,
          description: 'PostQueen — founding member',
          metadata: {
            service: SUBSCRIPTION_SERVICE_TAG,
            organizationId,
            lifetime_charge: '1',
          },
        },
        { idempotencyKey: `lifetime-charge-${organizationId}` }
      );

      if (pi.status === 'succeeded' || pi.status === 'processing') {
        const existing = await this._subscriptionService.getCode(
          `lifetime-charge:${pi.id}`
        );
        if (!existing) {
          await this._subscriptionService.createUsedCode(
            organizationId,
            `lifetime-charge:${pi.id}`
          );
        }
        return { charged: true };
      }
      return { charged: false, status: pi.status };
    } catch (err) {
      return { charged: false, error: 'stripe_error' };
    }
  }

  /**
   * Cancel-flow retention for founding-member trial: charge half of
   * `LIFETIME_PRICE` ($24.50), mark the founding fee settled (so a later
   * `captureFoundingLifetimeIfDue` cannot bill $49), and end the trial.
   */
  async applyLifetimeRetentionOffer(organizationId: string): Promise<{
    ok: boolean;
    error?: 'not_eligible' | 'no_payment_method' | 'capture_failed' | 'stripe_error';
    status?: string;
  }> {
    const org = await this._organizationService.getOrgById(organizationId);
    if (!org?.paymentId || !org.isTrailing) {
      return { ok: false, error: 'not_eligible' };
    }

    const subscription =
      await this._subscriptionService.getSubscriptionByOrganizationId(
        organizationId
      );
    if (!subscription?.isLifetime) {
      return { ok: false, error: 'not_eligible' };
    }

    const codes = await this._subscriptionService.getCodesByOrgId(
      organizationId
    );
    const codeList = codes.map((c) => c.code);
    if (codeList.some((c) => c.startsWith('lifetime-retention:'))) {
      await this._organizationService.endTrial(organizationId);
      return { ok: true };
    }

    const customer = await stripe.customers.retrieve(org.paymentId);
    if ((customer as { deleted?: boolean }).deleted) {
      return { ok: false, error: 'no_payment_method' };
    }
    const live = customer as Stripe.Customer;
    const defaultPm =
      typeof live.invoice_settings?.default_payment_method === 'string'
        ? live.invoice_settings.default_payment_method
        : live.invoice_settings?.default_payment_method?.id;

    if (!defaultPm) {
      return { ok: false, error: 'no_payment_method' };
    }

    try {
      const pi = await stripe.paymentIntents.create(
        {
          amount: Math.round(LIFETIME_RETENTION_PRICE * 100),
          currency: 'usd',
          customer: org.paymentId,
          payment_method: defaultPm,
          off_session: true,
          confirm: true,
          description: 'PostQueen — founding member (retention)',
          metadata: {
            service: SUBSCRIPTION_SERVICE_TAG,
            organizationId,
            lifetime_retention: '1',
            lifetime_charge: '1',
          },
        },
        { idempotencyKey: `lifetime-retention-${organizationId}` }
      );

      if (pi.status === 'succeeded' || pi.status === 'processing') {
        const chargeCode = `lifetime-charge:${pi.id}`;
        const retentionCode = `lifetime-retention:${pi.id}`;
        if (!(await this._subscriptionService.getCode(chargeCode))) {
          await this._subscriptionService.createUsedCode(
            organizationId,
            chargeCode
          );
        }
        if (!(await this._subscriptionService.getCode(retentionCode))) {
          await this._subscriptionService.createUsedCode(
            organizationId,
            retentionCode
          );
        }
        await this._organizationService.endTrial(organizationId);
        return { ok: true };
      }
      return { ok: false, error: 'capture_failed', status: pi.status };
    } catch (err) {
      return { ok: false, error: 'stripe_error' };
    }
  }

  /**
   * Lazy settlement when a deferred founding purchase's trial window has
   * closed: charge once (idempotent), then clear the DB trial flag.
   *
   * Needed because `captureFoundingLifetimeIfDue` used to run only from
   * `/billing/is-trial-finished`, which the FinishTrial overlay alone polls —
   * somebody who waited out the seven days and never pressed the button kept
   * lifetime without ever being charged. Auth middleware derives `isTrailing`
   * read-only and cannot write or charge.
   *
   * If the founding fee is still owed and the charge fails, leave `isTrailing`
   * set in the DB. Middleware already hides the trial UI once the window
   * closes; clearing the flag here would unlock a founding member who never
   * paid.
   */
  async settleFoundingLifetimeAfterTrial(organizationId: string) {
    const capture = await this.captureFoundingLifetimeIfDue(organizationId, {
      force: false,
    });
    const captureBlocked = !!(
      ('error' in capture && capture.error) ||
      ('status' in capture && capture.status)
    );
    if (captureBlocked) {
      return capture;
    }
    const org = await this._organizationService.getOrgById(organizationId);
    if (org?.isTrailing && !trialWindow(org.createdAt).open) {
      await this._organizationService.endTrial(organizationId);
    }
    return capture;
  }

  /**
   * Whether this organization's free trial is still running.
   *
   * Both lifetime grants below used to hardcode `false` here, which ended the
   * trial the instant somebody bought the founding-member deal. The owner's
   * rule is the opposite: buying it leaves the trial running, and the person
   * becomes a founding member when it expires — or sooner, from the "End free
   * trial" button that the X panel and the Billing screen both offer.
   */
  private async stillTrialing(organizationId: string) {
    const org = await this._organizationService.getOrgById(organizationId);
    return !!org?.isTrailing && trialWindow(org.createdAt).open;
  }

  /**
   * Grants a lifetime entitlement that was paid for rather than redeemed.
   *
   * Deliberately the *same* effect as `lifetimeDeal` — same Pro grant, same
   * `createOrUpdateSubscription` call — so there is one way to become a
   * founding member and not two that can drift apart.
   *
   * `paymentRef` stands in for the redemption code. The repository derives
   * `isLifetime` from that argument being present, and using the Stripe session
   * id (or `lifetime-setup:…`) means the row records which checkout granted it.
   *
   * Idempotent by the same route redemption is: a ref already stored as a used
   * code is a webhook Stripe delivered twice, and it grants nothing the second
   * time.
   */
  async grantLifetimeFromPayment(organizationId: string, paymentRef: string) {
    const existing = await this._subscriptionService.getCode(paymentRef);
    if (existing) {
      return { success: true, duplicate: true };
    }

    // Founding purchase always grants Pro — not the trial tier, not one rung up.
    const nextPackage = LIFETIME_GRANT_TIER;
    const findPricing = pricing[nextPackage];

    await this._subscriptionService.createOrUpdateSubscription(
      await this.stillTrialing(organizationId),
      makeId(10),
      organizationId,
      findPricing.channel!,
      nextPackage,
      'MONTHLY',
      null,
      paymentRef,
      organizationId
    );

    // Mid-trial convert: cancel any recurring Stripe subscription so trial-end
    // cannot bill the plan price *and* the founding fee. Safe now that
    // `deleteSubscription` leaves lifetime rows alone.
    const org = await this._organizationService.getOrgById(organizationId);
    if (org?.paymentId) {
      await this.cancelOpenStripeSubscriptions(org.paymentId);
    }

    return { success: true, tier: nextPackage };
  }

  async lifetimeDeal(organizationId: string, code: string) {
    const getCurrentSubscription =
      await this._subscriptionService.getSubscriptionByOrganizationId(
        organizationId
      );
    if (getCurrentSubscription && !getCurrentSubscription?.isLifetime) {
      throw new Error('You already have a non lifetime subscription');
    }

    try {
      const testCode = AuthService.fixedDecryption(code);
      const findCode = await this._subscriptionService.getCode(testCode);
      if (findCode) {
        return {
          success: false,
        };
      }

      // Same grant as paid founding: always Pro (30 channels).
      const nextPackage = LIFETIME_GRANT_TIER;
      const findPricing = pricing[nextPackage];

      await this._subscriptionService.createOrUpdateSubscription(
        // Same rule as the paid grant above: redeeming a code does not cut a
        // running trial short.
        await this.stillTrialing(organizationId),
        makeId(10),
        organizationId,
        findPricing.channel!,
        nextPackage,
        'MONTHLY',
        null,
        testCode,
        organizationId
      );
      return {
        success: true,
      };
    } catch (err) {
      console.log(err);
      return {
        success: false,
      };
    }
  }
}
