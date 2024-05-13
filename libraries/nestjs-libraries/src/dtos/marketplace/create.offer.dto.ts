import {
  ArrayMinSize,
  IsNumber,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SocialMedia {
  @IsNumber()
  total: number;

  @IsString()
  value: string;

  @IsNumber()
  price: number;
}
export class CreateOfferDto {
  @IsString()
  group: string;

  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SocialMedia)
  socialMedia: SocialMedia[];
}
