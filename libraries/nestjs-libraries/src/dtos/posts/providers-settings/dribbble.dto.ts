import {
  ArrayMaxSize,
  IsArray,
  IsDefined,
  IsOptional,
  IsString,
  IsUrl,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class DribbbleTagsSettings {
  @IsString()
  value: string;

  @IsString()
  label: string;
}

export class DribbbleDto {
  @IsString()
  @IsDefined()
  @MinLength(1, {
    message: 'Title is required',
  })
  title: string;

  @IsString()
  @IsOptional()
  @IsUrl()
  team: string;

  @IsArray()
  @ArrayMaxSize(12)
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => DribbbleTagsSettings)
  tags: DribbbleTagsSettings[];
}
