import {
  Controller,
  Post,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PaymentService } from '@gitroom/nestjs-libraries/services/payment/payment.service';

@ApiTags('Stripe')
@Controller('/stripe')
export class StripeController {
  constructor(private readonly _paymentService: PaymentService) {}

  @Post('/')
  async stripe(@Req() req: RawBodyRequest<Request>) {
    return await this._paymentService.webhook(
      'stripe',
      req.rawBody,
      // @ts-ignore
      req.headers
    );
  }
}
