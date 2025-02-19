import {IsBoolean, IsDefined, IsEmail, IsIn, IsString, ValidateIf} from 'class-validator';

export class AddTeamMemberDto {
  @IsDefined()
  @IsEmail()
  @ValidateIf((o) => o.sendEmail)
  email: string;

  @IsString()
  @IsIn(['EDITOR', 'VIEWER', 'ADMIN'])
  role: string;

  @IsDefined()
  @IsBoolean()
  sendEmail: boolean;
}
