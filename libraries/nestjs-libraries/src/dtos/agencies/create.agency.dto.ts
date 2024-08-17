import { ArrayMaxSize, ArrayMinSize, IsDefined, IsString, IsUrl, MinLength } from 'class-validator';

export class CreateAgencyDto {
  @IsString()
  @MinLength(3)
  name: string;

  @IsUrl()
  @IsDefined()
  website: string;

  @IsUrl()
  facebook: string;

  @IsString()
  instagram: string;

  @IsString()
  twitter: string;

  @IsUrl()
  linkedin: string;

  @IsUrl()
  youtube: string;

  @IsUrl()
  tiktok: string;

  @IsString()
  logo: string;

  @IsString()
  shortDescription: string;

  @IsString()
  description: string;

  @IsString({
    each: true
  })
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  niche: string[];
}