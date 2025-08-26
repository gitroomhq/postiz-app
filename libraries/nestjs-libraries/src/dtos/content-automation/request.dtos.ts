import {
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
  IsEnum,
  IsDefined,
  ValidateNested,
  IsObject,
  MinLength,
  MaxLength,
  IsUUID,
  IsNumber,
  Min,
  Max
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  Platform,
  PostType,
  ContentCategory,
  ToneOfVoice,
  MarketingGoalType,
  ProductService,
  CompetitorInfo,
  MarketingGoal,
  WeeklySchedule,
  PlatformConfig,
  AutomationStatus,
  LogEntryStatus
} from './interfaces';

// Company Profile DTOs
export class ProductServiceDto implements ProductService {
  @IsString()
  @IsDefined()
  name: string;

  @IsString()
  @IsDefined()
  description: string;

  @IsString()
  @IsDefined()
  category: string;

  @IsArray()
  @IsString({ each: true })
  keyFeatures: string[];
}

export class CompetitorInfoDto implements CompetitorInfo {
  @IsString()
  @IsDefined()
  name: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsArray()
  @IsString({ each: true })
  strengths: string[];

  @IsArray()
  @IsString({ each: true })
  weaknesses: string[];

  @IsArray()
  @IsString({ each: true })
  differentiators: string[];
}

export class MarketingGoalDto implements MarketingGoal {
  @IsEnum(MarketingGoalType)
  @IsDefined()
  type: MarketingGoalType;

  @IsString()
  @IsDefined()
  description: string;

  @IsEnum(['high', 'medium', 'low'])
  @IsDefined()
  priority: 'high' | 'medium' | 'low';

  @IsArray()
  @IsString({ each: true })
  metrics: string[];
}

export class CreateCompanyProfileDto {
  @IsString()
  @IsDefined()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @IsString()
  @IsDefined()
  @MinLength(1)
  @MaxLength(50)
  industry: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductServiceDto)
  products: ProductServiceDto[];

  @IsString()
  @IsDefined()
  @MinLength(1)
  @MaxLength(500)
  targetAudience: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompetitorInfoDto)
  competitors: CompetitorInfoDto[];

  @IsString()
  @IsDefined()
  @MinLength(1)
  @MaxLength(500)
  usp: string;

  @IsString()
  @IsDefined()
  @MinLength(1)
  @MaxLength(500)
  brandVoice: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MarketingGoalDto)
  marketingGoals: MarketingGoalDto[];

  @IsOptional()
  @IsBoolean()
  isTemplate?: boolean;
}

export class UpdateCompanyProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  industry?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductServiceDto)
  products?: ProductServiceDto[];

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  targetAudience?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompetitorInfoDto)
  competitors?: CompetitorInfoDto[];

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  usp?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  brandVoice?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MarketingGoalDto)
  marketingGoals?: MarketingGoalDto[];

  @IsOptional()
  @IsBoolean()
  isTemplate?: boolean;
}

export class ContentPlanPreferencesDto {
  @IsArray()
  @IsEnum(Platform, { each: true })
  platforms: Platform[];

  @IsOptional()
  @IsArray()
  @IsEnum(PostType, { each: true })
  preferredPostTypes?: PostType[];

  @IsOptional()
  @IsArray()
  @IsEnum(ContentCategory, { each: true })
  preferredCategories?: ContentCategory[];

  @IsOptional()
  @IsEnum(ToneOfVoice)
  defaultToneOfVoice?: ToneOfVoice;

  @IsOptional()
  @IsObject()
  customSchedulingPreferences?: {
    postsPerDay?: number;
    preferredTimes?: string[];
    avoidWeekends?: boolean;
  };
}

export class GenerateContentPlanDto {
  @IsUUID()
  @IsDefined()
  companyProfileId: string;

  @IsString()
  @IsDefined()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ValidateNested()
  @Type(() => ContentPlanPreferencesDto)
  @IsDefined()
  preferences: ContentPlanPreferencesDto;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  additionalInstructions?: string;
}

export class PlanModificationDto {
  @IsString()
  @IsDefined()
  postId: string;

  @IsOptional()
  @IsEnum(Platform)
  platform?: Platform;

  @IsOptional()
  @IsEnum(PostType)
  postType?: PostType;

  @IsOptional()
  @IsEnum(ContentCategory)
  contentCategory?: ContentCategory;

  @IsOptional()
  @IsEnum(ToneOfVoice)
  toneOfVoice?: ToneOfVoice;

  @IsOptional()
  @IsString()
  scheduledTime?: string; // HH:mm format

  @IsOptional()
  @IsBoolean()
  isLocked?: boolean;

  @IsOptional()
  @IsString()
  action?: 'update' | 'delete' | 'add';
}

export class CustomizeContentPlanDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlanModificationDto)
  modifications: PlanModificationDto[];

  @IsOptional()
  @IsObject()
  weeklySchedule?: WeeklySchedule;

  @IsOptional()
  @IsObject()
  platformConfig?: PlatformConfig;
}

export class SaveTemplateDto {
  @IsString()
  @IsDefined()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class ActivateContentPlanDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  activationNotes?: string;
}

export class AutomationLogFiltersDto {
  @IsOptional()
  @IsUUID()
  contentPlanId?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(AutomationStatus, { each: true })
  status?: AutomationStatus[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  platforms?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  contentCategories?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => DateRangeDto)
  dateRange?: DateRangeDto;

  @IsOptional()
  @Type(() => Date)
  weekStartDate?: Date;

  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class DateRangeDto {
  @Type(() => Date)
  @IsDefined()
  start: Date;

  @Type(() => Date)
  @IsDefined()
  end: Date;
}

export class UpdateLogEntryDto {
  @IsOptional()
  @IsEnum(LogEntryStatus)
  status?: LogEntryStatus;

  @IsOptional()
  @Type(() => Date)
  scheduledFor?: Date;

  @IsOptional()
  @IsUUID()
  postId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  errorMessage?: string;
}

export class StartWeeklyAutomationDto {
  @IsUUID()
  @IsDefined()
  contentPlanId: string;

  @Type(() => Date)
  @IsDefined()
  weekStartDate: Date;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlannedPostDto)
  plannedPosts: PlannedPostDto[];
}

export class PlannedPostDto {
  @IsString()
  @IsDefined()
  postType: string;

  @IsString()
  @IsDefined()
  platform: string;

  @IsString()
  @IsDefined()
  contentCategory: string;

  @IsOptional()
  @Type(() => Date)
  scheduledFor?: Date;
}

export class TrackApiUsageDto {
  @IsNumber()
  @Min(1)
  @IsDefined()
  calls: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  operation?: string;

  @IsOptional()
  @IsObject()
  metadata?: {
    contentPlanId?: string;
    postType?: string;
    platform?: string;
  };
}

export class UpdateMonthlyLimitDto {
  @IsNumber()
  @Min(0)
  @IsDefined()
  monthlyLimit: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class PurchaseExtraCreditsDto {
  @IsNumber()
  @Min(1)
  @IsDefined()
  credits: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  transactionId?: string;
}

export class UsageStatsFiltersDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(24)
  months?: number;

  @IsOptional()
  @IsBoolean()
  includeProjections?: boolean;

  @IsOptional()
  @IsBoolean()
  includeHistory?: boolean;
}