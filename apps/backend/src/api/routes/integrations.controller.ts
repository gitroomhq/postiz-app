import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseFilters,
} from '@nestjs/common';
import { ioRedis } from '@gitroom/nestjs-libraries/redis/redis.service';
import { ConnectIntegrationDto } from '@gitroom/nestjs-libraries/dtos/integrations/connect.integration.dto';
import { IntegrationManager } from '@gitroom/nestjs-libraries/integrations/integration.manager';
import { IntegrationService } from '@gitroom/nestjs-libraries/database/prisma/integrations/integration.service';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { Organization, User } from '@prisma/client';
import { ApiKeyDto } from '@gitroom/nestjs-libraries/dtos/integrations/api.key.dto';
import { IntegrationFunctionDto } from '@gitroom/nestjs-libraries/dtos/integrations/integration.function.dto';
import {
  AuthorizationActions,
  Sections,
} from '@gitroom/backend/services/auth/permissions/permissions.service';
import { CheckPolicies } from '@gitroom/backend/services/auth/permissions/permissions.ability';
import { pricing } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/pricing';
import { ApiTags } from '@nestjs/swagger';
import { GetUserFromRequest } from '@gitroom/nestjs-libraries/user/user.from.request';
import { NotEnoughScopesFilter } from '@gitroom/nestjs-libraries/integrations/integration.missing.scopes';
import { PostsService } from '@gitroom/nestjs-libraries/database/prisma/posts/posts.service';
import { IntegrationTimeDto } from '@gitroom/nestjs-libraries/dtos/integrations/integration.time.dto';

@ApiTags('Integrations')
@Controller('/integrations')
export class IntegrationsController {
  constructor(
    private _integrationManager: IntegrationManager,
    private _integrationService: IntegrationService,
    private _postService: PostsService
  ) {}
  @Get('/')
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
        internalId: p.internalId,
        disabled: p.disabled,
        picture: p.picture,
        identifier: p.providerIdentifier,
        inBetweenSteps: p.inBetweenSteps,
        refreshNeeded: p.refreshNeeded,
        type: p.type,
        time: JSON.parse(p.postingTimes)
      })),
    };
  }

  @Get('/:id')
  getSingleIntegration(
    @Param('id') id: string,
    @Query('order') order: string,
    @GetUserFromRequest() user: User,
    @GetOrgFromRequest() org: Organization
  ) {
    return this._integrationService.getIntegrationForOrder(
      id,
      order,
      user.id,
      org.id
    );
  }

  @Get('/social/:integration')
  @CheckPolicies([AuthorizationActions.Create, Sections.CHANNEL])
  async getIntegrationUrl(
    @Param('integration') integration: string,
    @Query('refresh') refresh: string
  ) {
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
      await integrationProvider.generateAuthUrl(refresh);
    await ioRedis.set(`login:${state}`, codeVerifier, 'EX', 300);

    return { url };
  }

  @Post('/:id/time')
  async setTime(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body() body: IntegrationTimeDto
  ) {
    return this._integrationService.setTimes(org.id, id, body);
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
    const { id, name, token, picture, username } =
      await integrationProvider.authenticate(api.api);

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
      token,
      '',
      undefined,
      username,
      false
    );
  }

  @Post('/social/:integration/connect')
  @CheckPolicies([AuthorizationActions.Create, Sections.CHANNEL])
  @UseFilters(new NotEnoughScopesFilter())
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

    await ioRedis.del(`login:${body.state}`);

    const integrationProvider =
      this._integrationManager.getSocialIntegration(integration);
    const {
      accessToken,
      expiresIn,
      refreshToken,
      id,
      name,
      picture,
      username,
    } = await integrationProvider.authenticate({
      code: body.code,
      codeVerifier: getCodeVerifier,
      refresh: body.refresh,
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
      expiresIn,
      username,
      integrationProvider.isBetweenSteps,
      body.refresh,
      +body.timezone
    );
  }

  @Post('/disable')
  disableChannel(
    @GetOrgFromRequest() org: Organization,
    @Body('id') id: string
  ) {
    return this._integrationService.disableChannel(org.id, id);
  }

  @Post('/instagram/:id')
  async saveInstagram(
    @Param('id') id: string,
    @Body() body: { pageId: string; id: string },
    @GetOrgFromRequest() org: Organization
  ) {
    return this._integrationService.saveInstagram(org.id, id, body);
  }

  @Post('/facebook/:id')
  async saveFacebook(
    @Param('id') id: string,
    @Body() body: { page: string },
    @GetOrgFromRequest() org: Organization
  ) {
    return this._integrationService.saveFacebook(org.id, id, body.page);
  }

  @Post('/linkedin-page/:id')
  async saveLinkedin(
    @Param('id') id: string,
    @Body() body: { page: string },
    @GetOrgFromRequest() org: Organization
  ) {
    return this._integrationService.saveLinkedin(org.id, id, body.page);
  }

  @Post('/enable')
  enableChannel(
    @GetOrgFromRequest() org: Organization,
    @Body('id') id: string
  ) {
    return this._integrationService.enableChannel(
      org.id,
      // @ts-ignore
      org?.subscription?.totalChannels || pricing.FREE.channel,
      id
    );
  }

  @Delete('/')
  async deleteChannel(
    @GetOrgFromRequest() org: Organization,
    @Body('id') id: string
  ) {
    const isTherePosts = await this._integrationService.getPostsForChannel(
      org.id,
      id
    );
    if (isTherePosts.length) {
      for (const post of isTherePosts) {
        await this._postService.deletePost(org.id, post.group);
      }
    }

    return this._integrationService.deleteChannel(org.id, id);
  }
}
