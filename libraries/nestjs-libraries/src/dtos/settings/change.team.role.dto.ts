import { IsIn, IsString } from 'class-validator';

export class ChangeTeamRoleDto {
  @IsString()
  @IsIn(['USER', 'ADMIN'])
  role: 'USER' | 'ADMIN';
}
