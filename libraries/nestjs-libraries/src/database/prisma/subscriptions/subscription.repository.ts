import {Injectable} from "@nestjs/common";
import {PrismaRepository} from "@gitroom/nestjs-libraries/database/prisma/prisma.service";

@Injectable()
export class SubscriptionRepository {
  constructor(
    private readonly _subscription: PrismaRepository<'subscription'>,
    private readonly _organization: PrismaRepository<'organization'>,
  ) {
  }

  getSubscriptionByOrganizationId(organizationId: string) {
    return this._subscription.model.subscription.findFirst({
      where: {
        organizationId,
        subscriptionState: 'ACTIVE'
      },
    });
  }

  checkSubscription(organizationId: string, subscriptionId: string) {
    return this._subscription.model.subscription.findFirst({
      where: {
        organizationId,
        identifier: subscriptionId,
        subscriptionState: 'ACTIVE'
      },
    });
  }

  deleteSubscriptionByCustomerId(customerId: string) {
    return this._subscription.model.subscription.deleteMany({
      where: {
        organization: {
          paymentId: customerId
        }
      }
    });
  }

  updateCustomerId(organizationId: string, customerId: string) {
    return this._organization.model.organization.update({
      where: {
        id: organizationId
      },
      data: {
        paymentId: customerId
      }
    });
  }

  async getSubscriptionByCustomerId(customerId: string) {
    return this._subscription.model.subscription.findFirst({
      where: {
        organization: {
          paymentId: customerId
        }
      }
    });
  }

  async getOrganizationByCustomerId(customerId: string) {
    return this._organization.model.organization.findFirst({
      where: {
        paymentId: customerId
      }
    });
  }

  async createOrUpdateSubscription(identifier: string, customerId: string, billing: 'BASIC' | 'PRO', period: 'MONTHLY' | 'YEARLY', cancelAt: number | null) {
    const findOrg = (await this.getOrganizationByCustomerId(customerId))!;
    await this._subscription.model.subscription.upsert({
      where: {
        organizationId: findOrg.id,
        organization: {
          paymentId: customerId,
        }
      },
      update: {
        subscriptionTier: billing,
        period,
        subscriptionState: 'ACTIVE',
        identifier,
        cancelAt: cancelAt ? new Date(cancelAt * 1000) : null,
      },
      create: {
        organizationId: findOrg.id,
        subscriptionTier: billing,
        period,
        subscriptionState: 'ACTIVE',
        cancelAt: cancelAt ? new Date(cancelAt * 1000) : null,
        identifier
      }
    });
  }
}
