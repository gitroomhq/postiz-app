import { IsString, IsOptional, IsArray, IsBoolean, IsEnum, IsDefined, IsDateString, IsNumber, Min, Max } from 'class-validator';
import { Platform, PostType, ContentCategory, ToneOfVoice } from './interfaces';

export class ValidateContentPlanDto {
  @IsString()
  @IsDefined()
  companyProfileId: string;

  @IsArray()
  @IsEnum(Platform, { each: true })
  platforms: Platform[];

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  maxPostsPerWeek?: number;
}

export class GeneratePostDto {
  @IsString()
  @IsDefined()
  companyProfileId: string;

  @IsEnum(Platform)
  @IsDefined()
  platform: Platform;

  @IsEnum(PostType)
  @IsDefined()
  postType: PostType;

  @IsEnum(ContentCategory)
  @IsDefined()
  contentCategory: ContentCategory;

  @IsEnum(ToneOfVoice)
  @IsDefined()
  toneOfVoice: ToneOfVoice;

  @IsDateString()
  @IsDefined()
  scheduledFor: string;

  @IsOptional()
  @IsString()
  additionalContext?: string;

  @IsOptional()
  @IsBoolean()
  includeMedia?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];
}

export class BulkGeneratePostsDto {
  @IsString()
  @IsDefined()
  contentPlanId: string;

  @IsOptional()
  @IsDateString()
  weekStartDate?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specificPostIds?: string[];

  @IsOptional()
  @IsBoolean()
  regenerateExisting?: boolean;
}

export class UpdateAutomationStatusDto {
  @IsEnum(['active', 'paused', 'stopped'])
  @IsDefined()
  status: 'active' | 'paused' | 'stopped';

  @IsOptional()
  @IsString()
  reason?: string;
}

export class FilterAutomationLogsDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'PAUSED'])
  status?: string;

  @IsOptional()
  @IsEnum(Platform)
  platform?: Platform;

  @IsOptional()
  @IsEnum(ContentCategory)
  contentCategory?: ContentCategory;

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

export class RetryFailedGenerationDto {
  @IsString()
  @IsDefined()
  automationLogEntryId: string;

  @IsOptional()
  @IsString()
  alternativePrompt?: string;

  @IsOptional()
  @IsBoolean()
  useBackupStrategy?: boolean;
}