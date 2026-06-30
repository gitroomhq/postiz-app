import {
  IsDefined,
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { Provider } from '@prisma/client';

export class CreateOrgUserDto {
  // Optional login username (invited users pick one when setting their
  // password). Letters, numbers, dot, underscore and dash only.
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(40)
  @Matches(/^[a-zA-Z0-9._-]+$/, {
    message:
      'Username may only contain letters, numbers, dots, underscores and dashes',
  })
  username?: string;

  @IsString()
  @MinLength(3)
  @MaxLength(64)
  @IsDefined()
  @ValidateIf((o) => !o.providerToken)
  password: string;

  @IsString()
  @IsDefined()
  provider: Provider;

  @IsString()
  @IsDefined()
  @ValidateIf((o) => !o.password)
  providerToken: string;

  @IsEmail()
  @IsDefined()
  @ValidateIf((o) => !o.providerToken)
  email: string;

  // Optional: only the first (non-invited) admin signup creates a workspace
  // from this. Invited users do not get a personal workspace, so they don't
  // need to provide a company name.
  @IsOptional()
  @IsString()
  @MaxLength(128)
  company?: string;

  datafast_visitor_id: string;
}
