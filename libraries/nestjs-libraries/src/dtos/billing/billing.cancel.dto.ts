import { IsDefined, IsString } from 'class-validator';

export class BillingCancelDto {
  @IsString()
  @IsDefined()
  feedback: string;
}
