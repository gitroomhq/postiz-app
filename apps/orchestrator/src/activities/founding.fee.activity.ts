import { Injectable, Logger } from '@nestjs/common';
import { Activity, ActivityMethod } from 'nestjs-temporal-core';
import { StripeService } from '@gitroom/nestjs-libraries/services/stripe.service';
import { SubscriptionService } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.service';
import { OrganizationService } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.service';
import { isBillingEnabled } from '@gitroom/helpers/utils/billing.enabled';
import { trialWindow } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/pricing';

@Injectable()
@Activity()
export class FoundingFeeActivity {
  constructor(
    private _stripeService: StripeService,
    private _subscriptionService: SubscriptionService,
    private _organizationService: OrganizationService
  ) {}

  /**
   * Charge every deferred founding fee whose trial has ended.
   *
   * A founding purchase made during the trial saves the card and grants
   * lifetime at once; the founding fee is taken when the trial ends. That charge only
   * ever ran when the customer came back — `/user/self`, `is-trial-finished`,
   * the FinishTrial overlay — so somebody who never returned never paid, and
   * the public API and MCP never trigger it at all. This runs the same settle
   * on a schedule instead of waiting for a visit.
   *
   * The guards are the ones those paths already rely on: nothing is owed once
   * a `lifetime-charge:` code exists, the charge is idempotent per payment
   * method, and a declined card leaves the fee owed (and the founding locks
   * on) for the next run rather than clearing anything.
   */
  @ActivityMethod()
  async settleDueFoundingFees() {
    const result = { checked: 0, charged: 0, blocked: 0, waiting: 0 };
    if (!isBillingEnabled()) {
      return result;
    }

    const organizationIds =
      await this._subscriptionService.getOrgIdsWithDeferredFoundingSetup();

    for (const organizationId of organizationIds) {
      // One organization's failure must not stop the others being charged.
      try {
        if (!(await this._stripeService.isDeferredFoundingFeeOwed(organizationId))) {
          continue;
        }
        const org = await this._organizationService.getOrgById(organizationId);
        if (!org || trialWindow(org.createdAt).open) {
          continue;
        }

        result.checked++;
        const capture =
          await this._stripeService.settleFoundingLifetimeAfterTrial(
            organizationId
          );
        // Same reading the billing controller uses for `captureBlocked`.
        const blocked =
          ('error' in capture && capture.error) ||
          ('status' in capture && capture.status);
        // Declined before with the card still on file: nothing is attempted
        // until the card changes, so there is nothing new to report each hour.
        if (blocked === 'awaiting_payment_method') {
          result.waiting++;
          continue;
        }
        if (blocked) {
          result.blocked++;
          Logger.warn(
            `[founding] fee still owed for ${organizationId}: ${String(blocked)}`
          );
        } else if ('charged' in capture && capture.charged) {
          result.charged++;
          Logger.log(`[founding] fee charged for ${organizationId}`);
        }
      } catch (err) {
        result.blocked++;
        Logger.warn(
          `[founding] could not settle ${organizationId}: ${
            (err as Error)?.message ?? err
          }`
        );
      }
    }

    return result;
  }
}
