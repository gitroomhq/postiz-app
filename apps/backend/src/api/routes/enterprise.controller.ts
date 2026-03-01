import { Body, Controller, Param, Post, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from '@gitroom/helpers/auth/auth.service';
import { ioRedis } from '@gitroom/nestjs-libraries/redis/redis.service';
import { IntegrationManager } from '@gitroom/nestjs-libraries/integrations/integration.manager';
import { OrganizationService } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.service';

@ApiTags('Enterprise')
@Controller('/enterprise')
export class EnterpriseController {
  constructor(
    private _integrationManager: IntegrationManager,
    private _organizationService: OrganizationService
  ) {}

  @Post('/create-user')
  async createUser(@Body('params') params: string) {
    try {
      const { id, name, saasName, email } = AuthService.verifyJWT(params) as {
        id: string;
        name: string;
        email: string;
        saasName: string;
      };

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
      const load = AuthService.verifyJWT(params) as {
        redirectUrl: string;
        apiKey: string;
        refreshId?: string;
        provider: string;
        webhookUrl: string;
      };

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
}
