import {
  ArrayMaxSize,
  IsArray,
  IsDefined,
  IsOptional,
  IsString,
  Matches,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class MediumTagsSettings {
  @IsString()
  value: string;

  @IsString()
  label: string;
}

export class MediumSettingsDto {
  @IsString()
  @MinLength(2)
  @IsDefined()
  title: string;

  @IsString()
  @MinLength(2)
  @IsDefined()
  subtitle: string;

  @IsOptional()
  @IsString()
  @ValidateIf((o) => o.canonical && o.canonical.indexOf('(post:') === -1)
  @Matches(
    /^(|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})$/,
    {
      message: 'Invalid URL',
    }
  )
  canonical?: string;

  @IsString()
  @IsOptional()
  publication?: string;

  @IsArray()
  @ArrayMaxSize(4)
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(p => MediumTagsSettings)
  tags: MediumTagsSettings[];
}
