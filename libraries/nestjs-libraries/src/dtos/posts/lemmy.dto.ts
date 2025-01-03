import {
  ArrayMinSize,
  IsDefined,
  IsOptional,
  IsString,
  IsUrl,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class LemmySettingsDtoInner {
  @IsString()
  @MinLength(2)
  @IsDefined()
  subreddit: string;

  @IsString()
  @IsDefined()
  id: string;

  @IsString()
  @MinLength(2)
  @IsDefined()
  title: string;

  @ValidateIf((o) => o.url)
  @IsOptional()
  @IsUrl()
  url: string;
}

export class LemmySettingsValueDto {
  @Type(() => LemmySettingsDtoInner)
  @IsDefined()
  @ValidateNested()
  value: LemmySettingsDtoInner;
}

export class LemmySettingsDto {
  @Type(() => LemmySettingsValueDto)
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  subreddit: LemmySettingsValueDto[];
}
