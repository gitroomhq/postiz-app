import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class BillingCancelDto {
  @IsString()
  feedback: string;

  @IsOptional()
  @IsBoolean()
  deleteScheduledPosts?: boolean;
}
