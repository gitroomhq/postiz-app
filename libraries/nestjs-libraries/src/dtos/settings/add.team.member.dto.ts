import {
  IsBoolean,
  IsDefined,
  IsEmail,
  IsIn,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class AddTeamMemberDto {
  @IsDefined()
  @IsEmail()
  @ValidateIf((o) => o.sendEmail)
  email: string;

  @IsString()
  @IsIn(['USER', 'ADMIN'])
  role: string;

  @IsDefined()
  @IsBoolean()
  sendEmail: boolean;

  // Pre-fills the invited member's name once they register through the
  // invite link, instead of leaving it blank until they set it themselves.
  // ValidateIf (not IsOptional) so an empty string from the form is also
  // skipped, not just undefined.
  @ValidateIf((o) => !!o.name)
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  name?: string;
}
