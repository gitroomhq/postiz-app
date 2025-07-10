import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { Organization } from '@prisma/client';
import { StarsService } from '@gitroom/nestjs-libraries/database/prisma/stars/stars.service';
import { CheckPolicies } from '@gitroom/backend/services/auth/permissions/permissions.ability';
import { OrganizationService } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.service';
import { AddTeamMemberDto } from '@gitroom/nestjs-libraries/dtos/settings/add.team.member.dto';
import { ApiTags } from '@nestjs/swagger';
import { AuthorizationActions, Sections } from '@gitroom/backend/services/auth/permissions/permission.exception.class';

@ApiTags('Settings')
@Controller('/settings')
export class SettingsController {
  constructor(
    private _starsService: StarsService,
    private _organizationService: OrganizationService
  ) {}

  @Get('/github')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async getConnectedGithubAccounts(@GetOrgFromRequest() org: Organization) {
    return {
      github: (
        await this._starsService.getGitHubRepositoriesByOrgId(org.id)
      ).map((repo) => ({
        id: repo.id,
        login: repo.login,
      })),
    };
  }

  @Post('/github')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async addGitHub(
    @GetOrgFromRequest() org: Organization,
    @Body('code') code: string
  ) {
    if (!code) {
      throw new Error('No code provided');
    }
    await this._starsService.addGitHub(org.id, code);
  }

  @Get('/github/url')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  authUrl() {
    return {
      url: `https://github.com/login/oauth/authorize?client_id=${
        process.env.GITHUB_CLIENT_ID
      }&scope=${encodeURIComponent(
        'user:email'
      )}&redirect_uri=${encodeURIComponent(
        `${process.env.FRONTEND_URL}/settings`
      )}`,
    };
  }

  @Get('/organizations/:id')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async getOrganizations(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string
  ) {
    return {
      organizations: await this._starsService.getOrganizations(org.id, id),
    };
  }

  @Get('/organizations/:id/:github')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async getRepositories(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Param('github') github: string
  ) {
    return {
      repositories: await this._starsService.getRepositoriesOfOrganization(
        org.id,
        id,
        github
      ),
    };
  }

  @Post('/organizations/:id')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async updateGitHubLogin(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body('login') login: string
  ) {
    return this._starsService.updateGitHubLogin(org.id, id, login);
  }

  @Delete('/repository/:id')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  async deleteRepository(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string
  ) {
    return this._starsService.deleteRepository(org.id, id);
  }

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
}
