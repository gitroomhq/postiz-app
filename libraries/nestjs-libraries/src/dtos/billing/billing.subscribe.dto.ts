import { IsIn } from 'class-validator';

export class BillingSubscribeDto {
  @IsIn(['MONTHLY', 'YEARLY'])
  period: 'MONTHLY' | 'YEARLY';

  @IsIn(['STANDARD', 'PRO', 'TEAM', 'ULTIMATE', 'CREATOR', 'GROWTH', 'AGENCY'])
  billing: 'STANDARD' | 'PRO' | 'TEAM' | 'ULTIMATE' | 'CREATOR' | 'GROWTH' | 'AGENCY';

  utm: string;

  dub: string;

  datafast_session_id: string;
  datafast_visitor_id: string;
}
