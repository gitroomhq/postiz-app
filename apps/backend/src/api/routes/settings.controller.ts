import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { Organization } from '@prisma/client';
import { CheckPolicies } from '@gitroom/backend/services/auth/permissions/permissions.ability';
import { OrganizationService } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.service';
import { AddTeamMemberDto } from '@gitroom/nestjs-libraries/dtos/settings/add.team.member.dto';
import { ApiTags } from '@nestjs/swagger';
import { AuthorizationActions, Sections } from '@gitroom/backend/services/auth/permissions/permission.exception.class';
import { User } from 'facebook-nodejs-business-sdk';
import { GetUserFromRequest } from '@gitroom/nestjs-libraries/user/user.from.request';
import { UsersService } from '@gitroom/nestjs-libraries/database/prisma/users/users.service';
import { ChangePasswordDto } from '@gitroom/nestjs-libraries/dtos/settings/change.password.dto';
import { AuthService as AuthChecker } from '@gitroom/helpers/auth/auth.service';

@ApiTags('Settings')
@Controller('/settings')
export class SettingsController {
  constructor(
    private _organizationService: OrganizationService,
    private _userService: UsersService
  ) {}

  @Get('/team')
  @CheckPolicies(
    [AuthorizationActions.Create, Sections.TEAM_MEMBERS],
    [AuthorizationActions.Create, Sections.ADMIN]
  )
  async getTeam(@GetOrgFromRequest() org: Organization) {
    return this._organizationService.getTeam(org.id);
  }

  @Post('/team')
  @CheckPolicies(
    [AuthorizationActions.Create, Sections.TEAM_MEMBERS],
    [AuthorizationActions.Create, Sections.ADMIN]
  )
  async inviteTeamMember(
    @GetOrgFromRequest() org: Organization,
    @Body() body: AddTeamMemberDto
  ) {
    return this._organizationService.inviteTeamMember(org.id, body);
  }

  @Delete('/team/:id')
  @CheckPolicies(
    [AuthorizationActions.Create, Sections.TEAM_MEMBERS],
    [AuthorizationActions.Create, Sections.ADMIN]
  )
  deleteTeamMember(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string
  ) {
    return this._organizationService.deleteTeamMember(org, id);
  }

  @Post('/change-password')
  async changePassword(
    @GetUserFromRequest() user: User,
    @Body() body: ChangePasswordDto
  ) {
    const userWithPassword = await this._userService.getUserById(user.id);
    if(!userWithPassword || !AuthChecker.comparePassword(body.oldPassword, userWithPassword.password)) {
      return false;
    }
    return  this._userService.updatePassword(user.id, body.password);
  }
}
