import { IsDefined, IsEmail, IsIn, IsString } from 'class-validator';

export class AdminAddTeamMemberDto {
  @IsDefined()
  @IsEmail()
  email: string;

  @IsString()
  @IsIn(['USER', 'ADMIN'])
  role: string;
}
