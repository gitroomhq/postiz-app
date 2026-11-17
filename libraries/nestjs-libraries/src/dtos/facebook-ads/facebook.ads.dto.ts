import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import {
  BID_STRATEGIES,
  BILLING_EVENTS,
  CAMPAIGN_OBJECTIVES,
  DESTINATION_TYPES,
  OPTIMIZATION_GOALS,
} from '@gitroom/nestjs-libraries/integrations/facebook-ads/facebook.ads.client';

export class FacebookAdsConnectDto {
  @IsString()
  code: string;
}

export class SelectFacebookAdsContextDto {
  @IsOptional()
  @IsString()
  businessId?: string;

  @IsString()
  adAccountId: string;
}

export class CreateFacebookCampaignDto {
  @IsString()
  name: string;

  @IsIn([...CAMPAIGN_OBJECTIVES])
  objective: string;

  @IsOptional()
  @IsIn(['PAUSED', 'ACTIVE'])
  status?: 'PAUSED' | 'ACTIVE';
}

export class CreateFacebookAdGroupDto {
  @IsString()
  name: string;

  @IsString()
  campaignId: string;

  @IsIn([...OPTIMIZATION_GOALS])
  optimizationGoal: string;

  @IsIn([...BID_STRATEGIES])
  bidStrategy: string;

  @IsIn([...DESTINATION_TYPES])
  destinationType: string;

  @IsOptional()
  @IsIn([...BILLING_EVENTS])
  billingEvent?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  dailyBudget: number;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  bidAmount?: number;

  @IsOptional()
  @IsIn(['PAUSED', 'ACTIVE'])
  status?: 'PAUSED' | 'ACTIVE';
}

export class CreateFacebookAdDto {
  @IsString()
  name: string;

  @IsString()
  adGroupId: string;

  @IsString()
  pageId: string;

  @IsString()
  message: string;

  @IsString()
  link: string;

  @IsOptional()
  @IsString()
  headline?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsIn(['PAUSED', 'ACTIVE'])
  status?: 'PAUSED' | 'ACTIVE';
}