import { IsDefined, IsEmail, IsString, MaxLength, MinLength, IsEnum, ValidateIf } from 'class-validator';
import { Competitor, IndustryType, ToneOfVoiceType } from '@prisma/client';

export class CompanyProfileDto {
  @IsString()
  @IsDefined()
  name: string;

  @IsString()
  website: string;

  @IsString()
  @IsDefined()
  competitor: Competitor[];

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