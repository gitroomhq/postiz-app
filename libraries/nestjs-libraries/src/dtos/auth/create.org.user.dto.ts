import {
  IsDefined,
  IsEmail,
  IsEnum,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
// The enums module has no Prisma runtime behind it, so the browser can load it
// too (the register form validates with this DTO).
import { Provider } from '@gitroom/nestjs-libraries/database/prisma/generated/enums';

export class CreateOrgUserDto {
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  @IsDefined()
  @ValidateIf((o) => !o.providerToken)
  password: string;

  @IsString()
  @IsDefined()
  @IsEnum(Provider)
  provider: Provider;

  @IsString()
  @IsDefined()
  @ValidateIf((o) => !o.password)
  providerToken: string;

  @IsEmail()
  @IsDefined()
  @ValidateIf((o) => !o.providerToken)
  email: string;

  @IsString()
  @IsDefined()
  @MinLength(3)
  @MaxLength(128)
  company: string;

  datafast_visitor_id: string;
}
