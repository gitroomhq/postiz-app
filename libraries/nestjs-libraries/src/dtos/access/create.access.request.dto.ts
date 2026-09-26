import {
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

// postmonster: public landing form -> POST /public/access-requests (PRD 6)
export class CreateAccessRequestDto {
  @IsString()
  @MaxLength(120)
  name: string;

  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  role?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  networks?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(40)
  teamSize?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  useCase?: string;

  // postmonster: honeypot - humans never fill this, bots fill every field
  @IsOptional()
  @IsString()
  website?: string;
}
