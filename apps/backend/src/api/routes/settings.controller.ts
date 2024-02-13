import {Body, Controller, Delete, Get, Param, Post} from "@nestjs/common";
import {GetOrgFromRequest} from "@gitroom/nestjs-libraries/user/org.from.request";
import {Organization} from "@prisma/client";
import {StarsService} from "@gitroom/nestjs-libraries/database/prisma/stars/stars.service";

@Controller('/settings')
export class SettingsController {
    constructor(
        private starsService: StarsService,
    ) {
    }

    @Get('/github')
    async getConnectedGithubAccounts(
        @GetOrgFromRequest() org: Organization
    ) {
        return {
            github: (await this.starsService.getGitHubRepositoriesByOrgId(org.id)).map((repo) => ({
                id: repo.id,
                login: repo.login,
            }))
        }
    }

    @Post('/github')
    async addGitHub(
        @GetOrgFromRequest() org: Organization,
        @Body('code') code: string
    ) {
        if (!code) {
            throw new Error('No code provided');
        }
        await this.starsService.addGitHub(org.id, code);
    }

    @Get('/github/url')
    authUrl() {
        return {
            url: `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&scope=${encodeURIComponent('read:org repo')}&redirect_uri=${encodeURIComponent(`${process.env.FRONTEND_URL}/settings`)}`
        };
    }

    @Get('/organizations/:id')
    async getOrganizations(
        @GetOrgFromRequest() org: Organization,
        @Param('id') id: string
    ) {
        return {organizations: await this.starsService.getOrganizations(org.id, id)};
    }

    @Get('/organizations/:id/:github')
    async getRepositories(
        @GetOrgFromRequest() org: Organization,
        @Param('id') id: string,
        @Param('github') github: string,
    ) {
        return {repositories: await this.starsService.getRepositoriesOfOrganization(org.id, id, github)};
    }

    @Post('/organizations/:id')
    async updateGitHubLogin(
        @GetOrgFromRequest() org: Organization,
        @Param('id') id: string,
        @Body('login') login: string,
    ) {
        return this.starsService.updateGitHubLogin(org.id, id, login);
    }

    @Delete('/repository/:id')
    async deleteRepository(
        @GetOrgFromRequest() org: Organization,
        @Param('id') id: string
    ) {
        return this.starsService.deleteRepository(org.id, id);
    }
}