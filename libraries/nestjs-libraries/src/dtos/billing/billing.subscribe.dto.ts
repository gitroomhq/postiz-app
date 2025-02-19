import { IsIn } from 'class-validator';

export class BillingSubscribeDto {
  @IsIn(['MONTHLY', 'YEARLY'])
  period: 'MONTHLY' | 'YEARLY';

  @IsIn(['BASIC', 'PRO', 'BUSINESS'])
  billing: 'BASIC' | 'PRO' | 'BUSINESS';

  utm: string;

  tolt: string;
}
