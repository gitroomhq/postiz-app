import {
  IsArray,
  IsBoolean,
  IsDefined,
  IsOptional,
  IsString,
  IsUrl,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class Integrations {
  @IsString()
  @IsDefined()
  id: string;
}

export class AutopostDto {
  @IsString()
  @IsDefined()
  title: string;

  @IsString()
  @IsOptional()
  content: string;

  @IsString()
  @IsOptional()
  lastUrl: string;

  @IsBoolean()
  @IsDefined()
  onSlot: boolean;

  @IsBoolean()
  @IsDefined()
  syncLast: boolean;

  @IsUrl()
  @IsDefined()
  url: string;

  @IsBoolean()
  @IsDefined()
  active: boolean;

  @IsBoolean()
  @IsDefined()
  addPicture: boolean;

  @IsBoolean()
  @IsDefined()
  generateContent: boolean;

  @IsArray()
  @Type(() => Integrations)
  @ValidateNested({ each: true })
  integrations: Integrations[];
}
