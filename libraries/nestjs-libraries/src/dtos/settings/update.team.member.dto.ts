import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateTeamMemberDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  name: string;

  // Only present when the caller wants to change the member's role - the
  // service layer additionally enforces that only a super admin may set
  // this, regardless of what the client sends.
  @IsOptional()
  @IsIn(['USER', 'ADMIN'])
  role?: string;
}
