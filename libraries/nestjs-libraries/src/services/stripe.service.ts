import Stripe from 'stripe';
import { Injectable } from '@nestjs/common';
import { Organization } from '@prisma/client';
import { SubscriptionService } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.service';
import { OrganizationService } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.service';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import { BillingSubscribeDto } from '@gitroom/nestjs-libraries/dtos/billing/billing.subscribe.dto';
import { groupBy } from 'lodash';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

@Injectable()
export class StripeService {
  constructor(
    private _subscriptionService: SubscriptionService,
    private _organizationService: OrganizationService
  ) {}
  validateRequest(rawBody: Buffer, signature: string, endpointSecret: string) {
    return stripe.webhooks.constructEvent(rawBody, signature, endpointSecret);
  }
  createSubscription(event: Stripe.CustomerSubscriptionCreatedEvent) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const {
      id,
      billing,
      period,
    }: {
      billing: 'STANDARD' | 'PRO';
      period: 'MONTHLY' | 'YEARLY';
      id: string;
    } = event.data.object.metadata;
    return this._subscriptionService.createOrUpdateSubscription(
      id,
      event.data.object.customer as string,
      event?.data?.object?.items?.data?.[0]?.quantity || 0,
      billing,
      period,
      event.data.object.cancel_at
    );
  }
  updateSubscription(event: Stripe.CustomerSubscriptionUpdatedEvent) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const {
      id,
      billing,
      period,
    }: {
      billing: 'STANDARD' | 'PRO';
      period: 'MONTHLY' | 'YEARLY';
      id: string;
    } = event.data.object.metadata;
    return this._subscriptionService.createOrUpdateSubscription(
      id,
      event.data.object.customer as string,
      event?.data?.object?.items?.data?.[0]?.quantity || 0,
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

  async createOrGetCustomer(organization: Organization) {
    if (organization.paymentId) {
      return organization.paymentId;
    }

    const customer = await stripe.customers.create();
    await this._subscriptionService.updateCustomerId(
      organization.id,
      customer.id
    );
    return customer.id;
  }

  async getPackages() {
    const products = await stripe.prices.list({
      active: true,
      expand: ['data.tiers', 'data.product'],
      lookup_keys: [
        'standard_monthly',
        'standard_yearly',
        'pro_monthly',
        'pro_yearly',
      ],
    });

    const productsList = groupBy(
      products.data.map((p) => ({
        // @ts-ignore
        name: p.product?.name,
        recurring: p?.recurring?.interval!,
        price: p?.tiers?.[0]?.unit_amount! / 100,
      })),
      'recurring'
    );

    return { ...productsList };
  }

  async prorate(organizationId: string, body: BillingSubscribeDto) {
    const org = await this._organizationService.getOrgById(organizationId);
    const customer = await this.createOrGetCustomer(org!);

    const allProducts = await stripe.products.list({
      active: true,
      expand: ['data.prices'],
    });
    const findProduct = allProducts.data.find(
      (product) => product.name.toLowerCase() === body.billing.toLowerCase()
    );
    const pricesList = await stripe.prices.list({
      active: true,
      product: findProduct?.id,
    });

    const findPrice = pricesList.data.find(
      (p) =>
        p?.recurring?.interval?.toLowerCase() ===
        body?.period?.toLowerCase().replace('ly', '')
    );

    const proration_date = Math.floor(Date.now() / 1000);

    const currentUserSubscription = await stripe.subscriptions.list({
      customer,
      status: 'active',
    });

    try {
      const price = await stripe.invoices.retrieveUpcoming({
        customer,
        subscription: currentUserSubscription?.data?.[0]?.id,
        subscription_proration_behavior: 'create_prorations',
        subscription_billing_cycle_anchor: 'now',
        subscription_items: [
          {
            id: currentUserSubscription?.data?.[0]?.items?.data?.[0]?.id,
            price: findPrice?.id!,
            quantity: body?.total,
          },
        ],
        subscription_proration_date: proration_date,
      });

      return {
        price: price?.amount_remaining ? price?.amount_remaining / 100 : 0,
      };
    } catch (err) {
      return { price: 0 };
    }
  }

  async setToCancel(organizationId: string) {
    const id = makeId(10);
    const org = await this._organizationService.getOrgById(organizationId);
    const customer = await this.createOrGetCustomer(org!);
    const currentUserSubscription = await stripe.subscriptions.list({
      customer,
      status: 'active',
    });

    const { cancel_at } = await stripe.subscriptions.update(
      currentUserSubscription.data[0].id,
      {
        cancel_at_period_end:
          !currentUserSubscription.data[0].cancel_at_period_end,
        metadata: {
          service: 'gitroom',
          id,
        },
      }
    );

    return {
      id,
      cancel_at: cancel_at ? new Date(cancel_at * 1000) : undefined,
    };
  }

  async getCustomerByOrganizationId(organizationId: string) {
    const org = (await this._organizationService.getOrgById(organizationId))!;
    return org.paymentId;
  }

  async createBillingPortalLink(customer: string) {
    return stripe.billingPortal.sessions.create({
      customer,
      flow_data: {
        after_completion: {
          type: 'redirect',
          redirect: {
            return_url: process.env['FRONTEND_URL'] + '/billing',
          },
        },
        type: 'payment_method_update',
      },
    });
  }

  private async createCheckoutSession(
    uniqueId: string,
    customer: string,
    metaData: any,
    price: string,
    quantity: number
  ) {
    const { url } = await stripe.checkout.sessions.create({
      customer,
      success_url: process.env['FRONTEND_URL'] + `/billing?check=${uniqueId}`,
      mode: 'subscription',
      subscription_data: {
        metadata: {
          service: 'gitroom',
          ...metaData,
          uniqueId,
        },
      },
      allow_promotion_codes: true,
      line_items: [
        {
          price: price,
          quantity: quantity,
        },
      ],
    });

    return { url };
  }

  async subscribe(organizationId: string, body: BillingSubscribeDto) {
    const id = makeId(10);

    const org = await this._organizationService.getOrgById(organizationId);
    const customer = await this.createOrGetCustomer(org!);
    const allProducts = await stripe.products.list({
      active: true,
      expand: ['data.prices'],
    });
    const findProduct = allProducts.data.find(
      (product) => product.name.toLowerCase() === body.billing.toLowerCase()
    );
    const pricesList = await stripe.prices.list({
      active: true,
      product: findProduct!.id,
    });

    const findPrice = pricesList.data.find(
      (p) =>
        p?.recurring?.interval?.toLowerCase() ===
        body?.period?.toLowerCase().replace('ly', '')
    );
    const currentUserSubscription = await stripe.subscriptions.list({
      customer,
      status: 'active',
    });

    if (!currentUserSubscription.data.length) {
      return this.createCheckoutSession(
        id,
        customer,
        body,
        findPrice!.id,
        body.total
      );
    }

    try {
      await stripe.subscriptions.update(currentUserSubscription.data[0].id, {
        cancel_at_period_end: false,
        metadata: {
          service: 'gitroom',
          ...body,
          id,
        },
        proration_behavior: 'always_invoice',
        items: [
          {
            id: currentUserSubscription.data[0].items.data[0].id,
            price: findPrice!.id,
            quantity: body.total,
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
}
