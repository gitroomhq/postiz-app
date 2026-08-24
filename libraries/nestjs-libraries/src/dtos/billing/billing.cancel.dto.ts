import { IsBoolean, IsOptional } from 'class-validator';

export class BillingCancelDto {
  @IsOptional()
  @IsBoolean()
  deleteScheduledPosts?: boolean;
}
