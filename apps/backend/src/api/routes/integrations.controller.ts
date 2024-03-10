import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ioRedis } from '@gitroom/nestjs-libraries/redis/redis.service';
import { ConnectIntegrationDto } from '@gitroom/nestjs-libraries/dtos/integrations/connect.integration.dto';
import { IntegrationManager } from '@gitroom/nestjs-libraries/integrations/integration.manager';
import { IntegrationService } from '@gitroom/nestjs-libraries/database/prisma/integrations/integration.service';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { Organization } from '@prisma/client';
import { ApiKeyDto } from '@gitroom/nestjs-libraries/dtos/integrations/api.key.dto';
import { IntegrationFunctionDto } from '@gitroom/nestjs-libraries/dtos/integrations/integration.function.dto';
import {
  AuthorizationActions,
  Sections,
} from '@gitroom/backend/services/auth/permissions/permissions.service';
import { CheckPolicies } from '@gitroom/backend/services/auth/permissions/permissions.ability';

@Controller('/integrations')
export class IntegrationsController {
  constructor(
    private _integrationManager: IntegrationManager,
    private _integrationService: IntegrationService
  ) {}
  @Get('/')
  @CheckPolicies([AuthorizationActions.Create, Sections.CHANNEL])
  getIntegration() {
    return this._integrationManager.getAllIntegrations();
  }

  @Get('/list')
  async getIntegrationList(@GetOrgFromRequest() org: Organization) {
    return {
      integrations: (
        await this._integrationService.getIntegrationsList(org.id)
      ).map((p) => ({
        name: p.name,
        id: p.id,
        disabled: p.disabled,
        picture: p.picture,
        identifier: p.providerIdentifier,
        type: p.type,
      })),
    };
  }

  @Get('/social/:integration')
  async getIntegrationUrl(@Param('integration') integration: string) {
    if (
      !this._integrationManager
        .getAllowedSocialsIntegrations()
        .includes(integration)
    ) {
      throw new Error('Integration not allowed');
    }

    const integrationProvider =
      this._integrationManager.getSocialIntegration(integration);
    const { codeVerifier, state, url } =
      await integrationProvider.generateAuthUrl();
    await ioRedis.set(`login:${state}`, codeVerifier, 'EX', 300);

    return { url };
  }

  @Post('/function')
  async functionIntegration(
    @GetOrgFromRequest() org: Organization,
    @Body() body: IntegrationFunctionDto
  ) {
    const getIntegration = await this._integrationService.getIntegrationById(
      org.id,
      body.id
    );
    if (!getIntegration) {
      throw new Error('Invalid integration');
    }

    if (getIntegration.type === 'social') {
      const integrationProvider = this._integrationManager.getSocialIntegration(
        getIntegration.providerIdentifier
      );
      if (!integrationProvider) {
        throw new Error('Invalid provider');
      }

      if (integrationProvider[body.name]) {
        return integrationProvider[body.name](getIntegration.token, body.data);
      }
      throw new Error('Function not found');
    }

    if (getIntegration.type === 'article') {
      const integrationProvider =
        this._integrationManager.getArticlesIntegration(
          getIntegration.providerIdentifier
        );
      if (!integrationProvider) {
        throw new Error('Invalid provider');
      }

      if (integrationProvider[body.name]) {
        return integrationProvider[body.name](getIntegration.token, body.data);
      }
      throw new Error('Function not found');
    }
  }

  @Post('/article/:integration/connect')
  @CheckPolicies([AuthorizationActions.Create, Sections.CHANNEL])
  async connectArticle(
    @GetOrgFromRequest() org: Organization,
    @Param('integration') integration: string,
    @Body() api: ApiKeyDto
  ) {
    if (
      !this._integrationManager
        .getAllowedArticlesIntegrations()
        .includes(integration)
    ) {
      throw new Error('Integration not allowed');
    }

    if (!api) {
      throw new Error('Missing api');
    }

    const integrationProvider =
      this._integrationManager.getArticlesIntegration(integration);
    const { id, name, token, picture } = await integrationProvider.authenticate(
      api.api
    );

    if (!id) {
      throw new Error('Invalid api key');
    }

    return this._integrationService.createOrUpdateIntegration(
      org.id,
      name,
      picture,
      'article',
      String(id),
      integration,
      token
    );
  }

  @Post('/social/:integration/connect')
  @CheckPolicies([AuthorizationActions.Create, Sections.CHANNEL])
  async connectSocialMedia(
    @GetOrgFromRequest() org: Organization,
    @Param('integration') integration: string,
    @Body() body: ConnectIntegrationDto
  ) {
    if (
      !this._integrationManager
        .getAllowedSocialsIntegrations()
        .includes(integration)
    ) {
      throw new Error('Integration not allowed');
    }

    const getCodeVerifier = await ioRedis.get(`login:${body.state}`);
    if (!getCodeVerifier) {
      throw new Error('Invalid state');
    }

    const integrationProvider =
      this._integrationManager.getSocialIntegration(integration);
    const { accessToken, expiresIn, refreshToken, id, name, picture } =
      await integrationProvider.authenticate({
        code: body.code,
        codeVerifier: getCodeVerifier,
      });

    if (!id) {
      throw new Error('Invalid api key');
    }

    return this._integrationService.createOrUpdateIntegration(
      org.id,
      name,
      picture,
      'social',
      String(id),
      integration,
      accessToken,
      refreshToken,
      expiresIn
    );
  }

  @Post('/disable')
  disableChannel(
    @GetOrgFromRequest() org: Organization,
    @Body('id') id: string
  ) {
    return this._integrationService.disableChannel(org.id, id);
  }

  @Post('/enable')
  enableChannel(
    @GetOrgFromRequest() org: Organization,
    @Body('id') id: string
  ) {
    return this._integrationService.enableChannel(
      org.id,
      // @ts-ignore
      org.subscription.totalChannels,
      id
    );
  }

  @Delete('/')
  deleteChannel(
    @GetOrgFromRequest() org: Organization,
    @Body('id') id: string
  ) {
    // @ts-ignore
    return this._integrationService.deleteChannel(org.id, id);
  }
}
