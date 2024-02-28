import {
  ArrayMinSize,
  IsBoolean,
  IsDefined,
  IsString,
  IsUrl,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { MediaDto } from '@gitroom/nestjs-libraries/dtos/media/media.dto';
import { Type } from 'class-transformer';

export class RedditFlairDto {
  @IsString()
  @IsDefined()
  id: string;

  @IsString()
  @IsDefined()
  name: string;
}

export class RedditSettingsDtoInner {
  @IsString()
  @MinLength(2)
  @IsDefined()
  subreddit: string;

  @IsString()
  @MinLength(2)
  @IsDefined()
  title: string;

  @IsString()
  @MinLength(2)
  @IsDefined()
  type: string;

  @ValidateIf((e) => e.type === 'link')
  @IsUrl()
  @IsDefined()
  url: string;

  @IsBoolean()
  @IsDefined()
  is_flair_required: boolean;

  @ValidateIf((e) => e.is_flair_required)
  @IsDefined()
  @ValidateNested()
  flair: RedditFlairDto;

  @ValidateIf((e) => e.type === 'media')
  @ValidateNested({ each: true })
  @Type(() => MediaDto)
  @ArrayMinSize(1)
  media: MediaDto[];
}

export class RedditSettingsValueDto {
  @Type(() => RedditSettingsDtoInner)
  @IsDefined()
  @ValidateNested()
  value: RedditSettingsDtoInner;
}

export class RedditSettingsDto {
  @Type(() => RedditSettingsValueDto)
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  subreddit: RedditSettingsValueDto[];
}
