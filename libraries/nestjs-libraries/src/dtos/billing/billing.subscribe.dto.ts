import { IsIn } from 'class-validator';
import { Transform } from 'class-transformer';

export class BillingSubscribeDto {
  @IsIn(['MONTHLY', 'YEARLY'])
  period: 'MONTHLY' | 'YEARLY';

  @IsIn(['STANDARD', 'PRO', 'TEAM', 'ULTIMATE'])
  billing: 'STANDARD' | 'PRO' | 'TEAM' | 'ULTIMATE';

  utm: string;

  dub: string;

  datafast_session_id: string;
  datafast_visitor_id: string;

  // Facebook pixel cookies (_fbc / _fbp), saved on the subscription for the
  // trial and conversion events. A value that doesn't fit Stripe metadata
  // (500 chars) is dropped instead of failing the checkout.
  @Transform(({ value }) =>
    typeof value === 'string' && value.length <= 500 ? value : undefined
  )
  fbc: string;

  @Transform(({ value }) =>
    typeof value === 'string' && value.length <= 500 ? value : undefined
  )
  fbp: string;
}
