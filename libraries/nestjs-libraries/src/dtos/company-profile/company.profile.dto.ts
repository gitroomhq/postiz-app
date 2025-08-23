import {
  IsDefined,
  IsString,
  MaxLength,
  MinLength,
  IsEnum,
  IsArray,
  ValidateNested
} from 'class-validator';
import { IndustryType, ToneOfVoiceType, OfferingType } from '@prisma/client';
import { Type } from 'class-transformer';
export class Offering {
  @IsString()
  @IsDefined()
  name: string;

  @IsEnum(OfferingType)
  type: OfferingType;

  @IsString()
  @IsDefined()
  price: string;

  @IsString()
  @IsDefined()
  keyFeature: string;
}
export class CompanyProfileDto {
  @IsString()
  @IsDefined()
  name: string;

  @IsString()
  website: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Offering)
  offerings: Offering[];

  @IsString()
  description: string;

  @IsEnum(IndustryType)
  industry: IndustryType;

  @IsEnum(ToneOfVoiceType)
  toneOfVoice: ToneOfVoiceType;

  @IsString()
  targetAudience: string;

  @IsString()
  @MinLength(3)
  @MaxLength(12)
  brandColor: string;
}