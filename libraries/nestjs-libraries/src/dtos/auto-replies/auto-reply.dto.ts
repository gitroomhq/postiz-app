import {
  IsArray,
  IsBoolean,
  IsDefined,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export class AutoReplyDto {
  @IsString()
  @IsDefined()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsDefined()
  integrationId: string;

  @IsString()
  @IsOptional()
  postId?: string;

  @IsString()
  @IsOptional()
  postUrl?: string;

  @IsString()
  @IsOptional()
  postThumbnail?: string;

  @IsBoolean()
  @IsDefined()
  matchAnyPost: boolean;

  @IsArray()
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  keywords: string[];

  @IsBoolean()
  @IsDefined()
  matchAnyWord: boolean;

  @IsBoolean()
  @IsDefined()
  wholeWordMatch: boolean;

  @IsBoolean()
  @IsDefined()
  dmTriggerEnabled: boolean;

  @IsString()
  @IsDefined()
  @MaxLength(1000)
  dmMessage: string;

  @ValidateIf((o) => !!o.linkUrl)
  @IsUrl({ protocols: ['https', 'http'], require_protocol: true })
  @IsOptional()
  linkUrl?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  linkButtonLabel?: string;

  @IsBoolean()
  @IsDefined()
  openingDmEnabled: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(640)
  openingDmMessage?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  openingDmButtonLabel?: string;

  @IsBoolean()
  @IsDefined()
  requireFollow: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(640)
  followPromptMessage?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  followPromptButtonLabel?: string;

  @IsBoolean()
  @IsDefined()
  followUpEnabled: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  followUpMessage?: string;

  @IsInt()
  @Min(0)
  @Max(1380)
  followUpDelayMinutes: number;

  @IsBoolean()
  @IsDefined()
  publicReplyEnabled: boolean;

  @IsArray()
  @IsString({ each: true })
  @MaxLength(300, { each: true })
  publicReplyMessages: string[];

  @IsBoolean()
  @IsDefined()
  active: boolean;
}

export class AutoReplyInboxMessageDto {
  @IsString()
  @IsDefined()
  userId: string;

  @IsString()
  @IsDefined()
  @MaxLength(1000)
  message: string;
}
