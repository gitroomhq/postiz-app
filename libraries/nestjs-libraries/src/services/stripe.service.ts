import Stripe from 'stripe';
import {Injectable} from "@nestjs/common";
import {Organization} from "@prisma/client";
import {SubscriptionService} from "@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.service";
import {OrganizationService} from "@gitroom/nestjs-libraries/database/prisma/organizations/organization.service";
import {makeId} from "@gitroom/nestjs-libraries/services/make.is";
import {BillingSubscribeDto} from "@gitroom/nestjs-libraries/dtos/billing/billing.subscribe.dto";

const stripe = new Stripe(process.env.PAYMENT_SECRET_KEY!, {
  apiVersion: '2023-10-16'
});

@Injectable()
export class StripeService {
  constructor(
    private _subscriptionService: SubscriptionService,
    private _organizationService: OrganizationService,
  ) {
  }
  validateRequest(rawBody: Buffer, signature: string, endpointSecret: string) {
    return stripe.webhooks.constructEvent(rawBody, signature, endpointSecret);
  }
  createSubscription(event: Stripe.CustomerSubscriptionCreatedEvent) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const {id, billing, period}: { billing: 'BASIC' | 'PRO', period: 'MONTHLY' | 'YEARLY', id: string} = event.data.object.metadata;
    return this._subscriptionService.createOrUpdateSubscription(id, event.data.object.customer as string, billing, period, event.data.object.cancel_at);
  }
  updateSubscription(event: Stripe.CustomerSubscriptionUpdatedEvent) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const {id, billing, period}: { billing: 'BASIC' | 'PRO', period: 'MONTHLY' | 'YEARLY', id: string} = event.data.object.metadata;
    return this._subscriptionService.createOrUpdateSubscription(id, event.data.object.customer as string, billing, period, event.data.object.cancel_at);
  }

  async deleteSubscription(event: Stripe.CustomerSubscriptionDeletedEvent) {
    await this._subscriptionService.deleteSubscription(event.data.object.customer as string);
  }

  async createOrGetCustomer(organization: Organization) {
    if (organization.paymentId) {
      return organization.paymentId;
    }

    const customer = await stripe.customers.create();
    await this._subscriptionService.updateCustomerId(organization.id, customer.id);
    return customer.id;
  }

  async setToCancel(organizationId: string) {
    const id = makeId(10);
    const org = await this._organizationService.getOrgById(organizationId);
    const customer = await this.createOrGetCustomer(org!);
    const currentUserSubscription = await stripe.subscriptions.list({
      customer,
      status: 'active',
    });

    await stripe.subscriptions.update(currentUserSubscription.data[0].id, {
      cancel_at_period_end: !currentUserSubscription.data[0].cancel_at_period_end,
      metadata: {
        service: 'gitroom',
        id
      }
    });

    return {id};
  }

  async getCustomerByOrganizationId(organizationId: string) {
    const org = (await this._organizationService.getOrgById(organizationId))!;
    return org.paymentId;
  }

  async createBillingPortalLink(customer: string) {
    return stripe.billingPortal.sessions.create({
      customer,
    });
  }

  async subscribe(organizationId: string, body: BillingSubscribeDto) {
    const id = makeId(10);

    const org = await this._organizationService.getOrgById(organizationId);
    const customer = await this.createOrGetCustomer(org!);
    const allProducts = await stripe.products.list({
      active: true,
      expand: ['data.prices'],
    });
    const findProduct = allProducts.data.find(product => product.name.toLowerCase() === body.billing.toLowerCase());
    const pricesList = await stripe.prices.list({
      active: true,
      product: findProduct!.id,
    });

    const findPrice = pricesList.data.find(p => p?.recurring?.interval?.toLowerCase() === body?.period?.toLowerCase().replace('ly', ''));
    const currentUserSubscription = await stripe.subscriptions.list({
      customer,
      status: 'active',
    });

    if (!currentUserSubscription.data.length) {
      const {url} = await stripe.checkout.sessions.create({
        customer,
        success_url: process.env['FRONTEND_URL'] + `/billing?check=${id}`,
        mode: 'subscription',
        subscription_data: {
          metadata: {
            service: 'gitroom',
            ...body,
            id
          }
        },
        line_items: [
          {
            price: findPrice!.id,
            quantity: 1,
          }],
      });

      return {url};
    }

    try {
      await stripe.subscriptions.update(currentUserSubscription.data[0].id, {
        metadata: {
          service: 'gitroom',
          ...body,
          id
        }, items: [{
          id: currentUserSubscription.data[0].items.data[0].id, price: findPrice!.id,
        }]
      });

      return {id};
    }
    catch (err) {
      const {url} = await this.createBillingPortalLink(customer);
      return {
        portal: url
      }
    }
  }
}
