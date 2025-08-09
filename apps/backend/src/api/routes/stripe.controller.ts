import {
  Controller,
  Get,
  Header,
  HttpException,
  Param,
  Post,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { StripeService } from '@gitroom/nestjs-libraries/services/stripe.service';
import { ApiTags } from '@nestjs/swagger';
import { CodesService } from '@gitroom/nestjs-libraries/services/codes.service';

@ApiTags('Stripe')
@Controller('/stripe')
export class StripeController {
  constructor(
    private readonly _stripeService: StripeService,
    private readonly _codesService: CodesService
  ) {}
  @Post('/connect')
  stripeConnect(@Req() req: RawBodyRequest<Request>) {
    const event = this._stripeService.validateRequest(
      req.rawBody,
      // @ts-ignore
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
      // @ts-ignore
      req.headers['stripe-signature'],
      process.env.STRIPE_SIGNING_KEY
    );

    // Maybe it comes from another stripe webhook
    if (
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      event?.data?.object?.metadata?.service !== 'gitroom' &&
      event.type !== 'invoice.payment_succeeded'
    ) {
      return { ok: true };
    }

    try {
      switch (event.type) {
        case 'invoice.payment_succeeded':
          return this._stripeService.paymentSucceeded(event);
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
    } catch (e) {
      throw new HttpException(e, 500);
    }
  }

  @Get('/lifetime-deal-codes/:provider')
  @Header('Content-disposition', 'attachment; filename=codes.csv')
  @Header('Content-type', 'text/csv')
  async getStripeCodes(@Param('provider') providerToken: string) {
    return this._codesService.generateCodes(providerToken);
  }
}
