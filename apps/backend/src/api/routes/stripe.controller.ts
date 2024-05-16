import { Controller, Post, RawBodyRequest, Req } from '@nestjs/common';
import { StripeService } from '@gitroom/nestjs-libraries/services/stripe.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Stripe')
@Controller('/stripe')
export class StripeController {
  constructor(private readonly _stripeService: StripeService) {}
  @Post('/connect')
  stripeConnect(@Req() req: RawBodyRequest<Request>) {
    const event = this._stripeService.validateRequest(
      req.rawBody,
      req.headers['stripe-signature'],
      process.env.STRIPE_SIGNING_KEY_CONNECT
    );

    // Maybe it comes from another stripe webhook
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    if (event?.data?.object?.metadata?.service !== 'gitroom') {
      return { ok: true };
    }

    switch (event.type) {
      case 'checkout.session.completed':
        return this._stripeService.updateOrder(event);
      case 'account.updated':
        return this._stripeService.updateAccount(event);
      default:
        return { ok: true };
    }
  }

  @Post('/')
  stripe(@Req() req: RawBodyRequest<Request>) {
    const event = this._stripeService.validateRequest(
      req.rawBody,
      req.headers['stripe-signature'],
      process.env.STRIPE_SIGNING_KEY
    );

    // Maybe it comes from another stripe webhook
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    if (event?.data?.object?.metadata?.service !== 'gitroom') {
      return { ok: true };
    }

    switch (event.type) {
      case 'checkout.session.completed':
        return this._stripeService.updateOrder(event);
      case 'account.updated':
        return this._stripeService.updateAccount(event);
      case 'customer.subscription.created':
        return this._stripeService.createSubscription(event);
      case 'customer.subscription.updated':
        return this._stripeService.updateSubscription(event);
      case 'customer.subscription.deleted':
        return this._stripeService.deleteSubscription(event);
      default:
        return { ok: true };
    }
  }
}
