import { IsEnum } from 'class-validator';
import { Role } from '@prisma/client';

export class UpdateTeamMemberRoleDto {
  @IsEnum(Role)
  role: Role;
}
