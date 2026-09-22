import { Body, Controller, Param, Post, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from '@gitroom/helpers/auth/auth.service';
import { ioRedis } from '@gitroom/nestjs-libraries/redis/redis.service';
import { IntegrationManager } from '@gitroom/nestjs-libraries/integrations/integration.manager';
import { OrganizationService } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.service';
import { IntegrationService } from '@gitroom/nestjs-libraries/database/prisma/integrations/integration.service';
import { PostsService } from '@gitroom/nestjs-libraries/database/prisma/posts/posts.service';

@ApiTags('Enterprise')
@Controller('/enterprise')
export class EnterpriseController {
  constructor(
    private _integrationManager: IntegrationManager,
    private _organizationService: OrganizationService,
    private _integrationService: IntegrationService,
    private _postsService: PostsService
  ) {}

  private verifyEnterpriseToken<T extends object>(params: string): T {
    const payload = AuthService.verifyJWT(params) as any;
    if (
      !payload ||
      typeof payload !== 'object' ||
      'providerName' in payload || // login token (full User row)
      'orgId' in payload || // team invite token
      'expires' in payload // password reset token
    ) {
      throw new Error('Invalid enterprise token');
    }

    return payload as T;
  }

  @Post('/create-user')
  async createUser(@Body('params') params: string) {
    try {
      const { id, name, saasName, email } = this.verifyEnterpriseToken<{
        id: string;
        name: string;
        email: string;
        saasName: string;
      }>(params);

      if (!id || !saasName) {
        return { success: false };
      }

      try {
        return await this._organizationService.createMaxUser(
          id,
          name,
          saasName,
          email
        );
      } catch (err) {
        return { create: false };
      }
    } catch (err) {
      return { success: false };
    }
  }

  @Post('/url')
  async redirectParams(@Body('params') params: string) {
    try {
      const load = this.verifyEnterpriseToken<{
        redirectUrl: string;
        apiKey: string;
        refreshId?: string;
        provider: string;
        webhookUrl: string;
      }>(params);

      if (!load || !load.redirectUrl || !load.apiKey || !load.provider) {
        return;
      }

      const org = await this._organizationService.getOrgByApiKey(load.apiKey);

      if (!org) {
        throw new Error('Organization not found');
      }

      if (
        !this._integrationManager
          .getAllowedSocialsIntegrations()
          .includes(load.provider)
      ) {
        throw new Error('Integration not allowed');
      }

      const integrationProvider = this._integrationManager.getSocialIntegration(
        load.provider
      );

      const { codeVerifier, state, url } =
        await integrationProvider.generateAuthUrl();

      if (load.refreshId) {
        await ioRedis.set(`refresh:${state}`, load.refreshId, 'EX', 3600);
      }

      await ioRedis.set(`webhookUrl:${state}`, load.webhookUrl, 'EX', 3600);
      await ioRedis.set(`redirect:${state}`, load.redirectUrl, 'EX', 3600);
      await ioRedis.set(`organization:${state}`, org.id, 'EX', 3600);
      await ioRedis.set(`login:${state}`, codeVerifier, 'EX', 3600);

      return url;
    } catch (err) {}
  }

  @Post('/delete-channel')
  async deleteChannel(@Body('params') params: string) {
    try {
      const load = this.verifyEnterpriseToken<{
        apiKey: string;
        id: string;
      }>(params);

      if (!load || !load.apiKey || !load.id) {
        return { success: false };
      }

      const org = await this._organizationService.getOrgByApiKey(load.apiKey);

      if (!org) {
        return { success: false };
      }

      const isTherePosts = await this._integrationService.getPostsForChannel(
        org.id,
        load.id
      );
      if (isTherePosts.length) {
        for (const post of isTherePosts) {
          this._postsService.deletePost(org.id, post.group).catch(() => {});
        }
      }

      await this._integrationService.deleteChannel(org.id, load.id);
      return { success: true };
    } catch (err) {
      return { success: false };
    }
  }
}
