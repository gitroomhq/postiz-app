import {
  Controller,
  HttpException,
  Post,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import {
  StripeService,
  SUBSCRIPTION_SERVICE_TAG,
} from '@gitroom/nestjs-libraries/services/stripe.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Stripe')
@Controller('/stripe')
export class StripeController {
  constructor(
    private readonly _stripeService: StripeService,
  ) {}

  @Post('/')
  stripe(@Req() req: RawBodyRequest<Request>) {
    const event = this._stripeService.validateRequest(
      req.rawBody,
      // @ts-ignore
      req.headers['stripe-signature'],
      process.env.STRIPE_SIGNING_KEY
    );

    // One Stripe account can serve several integrations, so ignore anything we
    // did not create.
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const service = event?.data?.object?.metadata?.service;
    const isOurs = service === SUBSCRIPTION_SERVICE_TAG;

    // An invoice carries no `metadata.service` — that lives on the subscription
    // it bills — so both invoice events have to be exempted from the check
    // above or they are dropped before the switch ever sees them. That is why
    // `payment_succeeded` was already listed here; `payment_failed` joins it
    // for the same reason.
    const INVOICE_EVENTS = ['invoice.payment_succeeded', 'invoice.payment_failed'];

    if (!isOurs && !INVOICE_EVENTS.includes(event.type)) {
      return { ok: true };
    }

    try {
      switch (event.type) {
        // Lifetime checkout: immediate `mode: 'payment'`, or deferred
        // `mode: 'setup'` (+ lifetime_deferred) that grants now and charges
        // $49 when the trial ends. Neither is a subscription event.
        case 'checkout.session.completed': {
          // @ts-ignore — the session shape is narrower than Stripe.Event
          const session = event.data.object as any;
          const organizationId = session?.metadata?.organizationId;

          // Deferred founding checkout: card on file, charge later.
          if (
            session?.mode === 'setup' &&
            session?.metadata?.lifetime_deferred === '1'
          ) {
            if (!organizationId) {
              throw new Error(
                'checkout.session.completed setup lifetime missing organizationId'
              );
            }
            return this._stripeService.completeDeferredLifetimeSetup(
              organizationId,
              session
            );
          }

          if (session?.mode !== 'payment') {
            return { ok: true };
          }
          if (!organizationId) {
            // Nothing to grant it to. Loud rather than silent: a paid session
            // with no organization is a bug in whatever created it.
            throw new Error(
              'checkout.session.completed with mode=payment and no organizationId'
            );
          }
          return this._stripeService.grantLifetimeFromPayment(
            organizationId,
            session.id
          );
        }
        case 'invoice.payment_succeeded':
          return this._stripeService.paymentSucceeded(event);
        // A renewal that could not be charged. Unhandled until now, so the only
        // thing a customer with a dead card saw was nothing at all — until
        // Stripe gave up weeks later and cancelled the subscription, at which
        // point the app went to the paywall with no explanation.
        case 'invoice.payment_failed':
          return this._stripeService.paymentFailed(event);
        case 'customer.subscription.created':
          return this._stripeService.createSubscription(event);
        case 'customer.subscription.updated':
          return this._stripeService.updateSubscription(event);
        case 'customer.subscription.deleted':
          return this._stripeService.deleteSubscription(event);
        default:
          return { ok: true };
      }
    } catch (e) {
      throw new HttpException(e, 500);
    }
  }
}
