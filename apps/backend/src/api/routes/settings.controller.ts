import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  Logger,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { GetUserFromRequest } from '@gitroom/nestjs-libraries/user/user.from.request';
import { Organization, User } from '@gitroom/nestjs-libraries/database/prisma/generated/client';
import { CheckPolicies } from '@gitroom/backend/services/auth/permissions/permissions.ability';
import { OrganizationService } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.service';
import { AddTeamMemberDto } from '@gitroom/nestjs-libraries/dtos/settings/add.team.member.dto';
import { AdminAddTeamMemberDto } from '@gitroom/nestjs-libraries/dtos/settings/admin.add.team.member.dto';
import { ShortlinkPreferenceDto } from '@gitroom/nestjs-libraries/dtos/settings/shortlink-preference.dto';
import { ChangeTeamRoleDto } from '@gitroom/nestjs-libraries/dtos/settings/change.team.role.dto';
import { TransferOwnershipDto } from '@gitroom/nestjs-libraries/dtos/settings/transfer.ownership.dto';
import { UpdateOrganizationDto } from '@gitroom/nestjs-libraries/dtos/settings/update.organization.dto';
import { SameOriginGuard } from '@gitroom/backend/services/auth/same-origin.guard';
import { StripeService } from '@gitroom/nestjs-libraries/services/stripe.service';
import { ApiTags } from '@nestjs/swagger';
import { AuthorizationActions, Sections } from '@gitroom/backend/services/auth/permissions/permission.exception.class';

@ApiTags('Settings')
@Controller('/settings')
export class SettingsController {
  private readonly _logger = new Logger(SettingsController.name);

  constructor(
    private _organizationService: OrganizationService,
    private _stripeService: StripeService
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
  @UseGuards(SameOriginGuard)
  @CheckPolicies(
    [AuthorizationActions.Create, Sections.TEAM_MEMBERS],
    [AuthorizationActions.Create, Sections.ADMIN]
  )
  async inviteTeamMember(
    @GetOrgFromRequest() org: Organization,
    @GetUserFromRequest() user: User,
    @Body() body: AddTeamMemberDto
  ) {
    return this._organizationService.inviteTeamMember(org, user, body);
  }

  @Post('/team/add')
  @UseGuards(SameOriginGuard)
  async addTeamMember(
    @GetUserFromRequest() user: User,
    @GetOrgFromRequest() org: Organization,
    @Body() body: AdminAddTeamMemberDto
  ) {
    if (!user.isSuperAdmin) {
      throw new HttpException('Unauthorized', 400);
    }

    return this._organizationService.addTeamMemberByEmail(org, body);
  }

  @Post('/team/transfer')
  @UseGuards(SameOriginGuard)
  @CheckPolicies(
    [AuthorizationActions.Create, Sections.TEAM_MEMBERS],
    [AuthorizationActions.Create, Sections.ADMIN]
  )
  transferOwnership(
    @GetOrgFromRequest() org: Organization,
    @GetUserFromRequest() user: User,
    @Body() body: TransferOwnershipDto
  ) {
    return this._organizationService.transferOwnership(
      org,
      user.id,
      body.userId,
      body.confirm
    );
  }

  @Post('/team/leave')
  @UseGuards(SameOriginGuard)
  leaveWorkspace(
    @GetOrgFromRequest() org: Organization,
    @GetUserFromRequest() user: User
  ) {
    return this._organizationService.leaveWorkspace(org, user.id);
  }

  @Patch('/team/:id')
  @UseGuards(SameOriginGuard)
  @CheckPolicies(
    [AuthorizationActions.Create, Sections.TEAM_MEMBERS],
    [AuthorizationActions.Create, Sections.ADMIN]
  )
  changeTeamRole(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body() body: ChangeTeamRoleDto
  ) {
    return this._organizationService.changeTeamRole(org, id, body.role);
  }

  @Delete('/team/:id')
  @UseGuards(SameOriginGuard)
  @CheckPolicies(
    [AuthorizationActions.Create, Sections.TEAM_MEMBERS],
    [AuthorizationActions.Create, Sections.ADMIN]
  )
  deleteTeamMember(
    @GetOrgFromRequest() org: Organization,
    @GetUserFromRequest() user: User,
    @Param('id') id: string
  ) {
    return this._organizationService.deleteTeamMember(org, id, user.id);
  }

  @Post('/organization')
  @UseGuards(SameOriginGuard)
  async updateOrganization(
    @GetOrgFromRequest() org: Organization,
    @Body() body: UpdateOrganizationDto
  ) {
    const updated = await this._organizationService.updateOrganizationName(
      org,
      body.name
    );
    try {
      await this._stripeService.syncCustomerName(updated);
    } catch (err) {
      this._logger.error(
        `Failed to sync Stripe customer name for org ${org.id}`,
        err as Error
      );
    }
    return { name: updated.name };
  }

  @Get('/shortlink')
  async getShortlinkPreference(@GetOrgFromRequest() org: Organization) {
    return this._organizationService.getShortlinkPreference(org.id);
  }

  @Post('/shortlink')
  @UseGuards(SameOriginGuard)
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async updateShortlinkPreference(
    @GetOrgFromRequest() org: Organization,
    @Body() body: ShortlinkPreferenceDto
  ) {
    return this._organizationService.updateShortlinkPreference(
      org.id,
      body.shortlink
    );
  }
}
