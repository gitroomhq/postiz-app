import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
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
import { CheckPolicies } from '@gitroom/backend/services/auth/permissions/permissions.ability';
import { pricing } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/pricing';
import { ApiTags } from '@nestjs/swagger';
import { GetUserFromRequest } from '@gitroom/nestjs-libraries/user/user.from.request';
import { NotEnoughScopesFilter } from '@gitroom/nestjs-libraries/integrations/integration.missing.scopes';
import { PostsService } from '@gitroom/nestjs-libraries/database/prisma/posts/posts.service';
import { IntegrationTimeDto } from '@gitroom/nestjs-libraries/dtos/integrations/integration.time.dto';
import { AuthService } from '@gitroom/helpers/auth/auth.service';
import { AuthTokenDetails } from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import { PlugDto } from '@gitroom/nestjs-libraries/dtos/plugs/plug.dto';
import {
  NotEnoughScopes,
  RefreshToken,
} from '@gitroom/nestjs-libraries/integrations/social.abstract';
import { timer } from '@gitroom/helpers/utils/timer';
import { TelegramProvider } from '@gitroom/nestjs-libraries/integrations/social/telegram.provider';
import {
  AuthorizationActions,
  Sections,
} from '@gitroom/backend/services/auth/permissions/permission.exception.class';
import { uniqBy } from 'lodash';

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

  @Get('/:identifier/internal-plugs')
  getInternalPlugs(@Param('identifier') identifier: string) {
    return this._integrationManager.getInternalPlugs(identifier);
  }

  @Get('/customers')
  getCustomers(@GetOrgFromRequest() org: Organization) {
    return this._integrationService.customers(org.id);
  }

  @Put('/:id/group')
  async updateIntegrationGroup(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body() body: { group: string }
  ) {
    return this._integrationService.updateIntegrationGroup(
      org.id,
      id,
      body.group
    );
  }

  @Put('/:id/customer-name')
  async updateOnCustomerName(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body() body: { name: string }
  ) {
    return this._integrationService.updateOnCustomerName(org.id, id, body.name);
  }

  @Get('/list')
  async getIntegrationList(@GetOrgFromRequest() org: Organization) {
    return {
      integrations: await Promise.all(
        (
          await this._integrationService.getIntegrationsList(org.id)
        ).map(async (p) => {
          const findIntegration = this._integrationManager.getSocialIntegration(
            p.providerIdentifier
          );
          return {
            name: p.name,
            id: p.id,
            internalId: p.internalId,
            disabled: p.disabled,
            editor: findIntegration.editor,
            picture: p.picture || '/no-picture.jpg',
            identifier: p.providerIdentifier,
            inBetweenSteps: p.inBetweenSteps,
            refreshNeeded: p.refreshNeeded,
            isCustomFields: !!findIntegration.customFields,
            ...(findIntegration.customFields
              ? { customFields: await findIntegration.customFields() }
              : {}),
            display: p.profile,
            type: p.type,
            time: JSON.parse(p.postingTimes),
            changeProfilePicture: !!findIntegration?.changeProfilePicture,
            changeNickName: !!findIntegration?.changeNickname,
            customer: p.customer,
            additionalSettings: p.additionalSettings || '[]',
          };
        })
      ),
    };
  }

  @Post('/:id/settings')
  async updateProviderSettings(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body('additionalSettings') body: string
  ) {
    if (typeof body !== 'string') {
      throw new Error('Invalid body');
    }

    await this._integrationService.updateProviderSettings(org.id, id, body);
  }
  @Post('/:id/nickname')
  async setNickname(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body() body: { name: string; picture: string }
  ) {
    const integration = await this._integrationService.getIntegrationById(
      org.id,
      id
    );
    if (!integration) {
      throw new Error('Invalid integration');
    }

    const manager = this._integrationManager.getSocialIntegration(
      integration.providerIdentifier
    );
    if (!manager.changeProfilePicture && !manager.changeNickname) {
      throw new Error('Invalid integration');
    }

    const { url } = manager.changeProfilePicture
      ? await manager.changeProfilePicture(
          integration.internalId,
          integration.token,
          body.picture
        )
      : { url: '' };

    const { name } = manager.changeNickname
      ? await manager.changeNickname(
          integration.internalId,
          integration.token,
          body.name
        )
      : { name: '' };

    return this._integrationService.updateNameAndUrl(id, name, url);
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
    @Query('refresh') refresh: string,
    @Query('externalUrl') externalUrl: string
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

    if (integrationProvider.externalUrl && !externalUrl) {
      throw new Error('Missing external url');
    }

    try {
      const getExternalUrl = integrationProvider.externalUrl
        ? {
            ...(await integrationProvider.externalUrl(externalUrl)),
            instanceUrl: externalUrl,
          }
        : undefined;

      const { codeVerifier, state, url } =
        await integrationProvider.generateAuthUrl(getExternalUrl);

      if (refresh) {
        await ioRedis.set(`refresh:${state}`, refresh, 'EX', 300);
      }

      await ioRedis.set(`login:${state}`, codeVerifier, 'EX', 300);
      await ioRedis.set(
        `external:${state}`,
        JSON.stringify(getExternalUrl),
        'EX',
        300
      );

      return { url };
    } catch (err) {
      return { err: true };
    }
  }

  @Post('/:id/time')
  async setTime(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body() body: IntegrationTimeDto
  ) {
    return this._integrationService.setTimes(org.id, id, body);
  }

  @Post('/mentions')
  async mentions(
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

    const list = await this._integrationService.getMentions(
      getIntegration.providerIdentifier,
      body?.data?.query
    );

    let newList = [];
    try {
      newList = await this.functionIntegration(org, body);
    } catch (err) {}

    if (newList.length) {
      await this._integrationService.insertMentions(
        getIntegration.providerIdentifier,
        newList.map((p: any) => ({
          name: p.label,
          username: p.id,
          image: p.image,
        })).filter((f: any) => f.name)
      );
    }

    return uniqBy(
      [
        ...list.map((p) => ({
          id: p.username,
          image: p.image,
          label: p.name,
        })),
        ...newList,
      ],
      (p) => p.id
    ).filter(f => f.label && f.image && f.id);
  }

  @Post('/function')
  async functionIntegration(
    @GetOrgFromRequest() org: Organization,
    @Body() body: IntegrationFunctionDto
  ): Promise<any> {
    const getIntegration = await this._integrationService.getIntegrationById(
      org.id,
      body.id
    );
    if (!getIntegration) {
      throw new Error('Invalid integration');
    }

    const integrationProvider = this._integrationManager.getSocialIntegration(
      getIntegration.providerIdentifier
    );
    if (!integrationProvider) {
      throw new Error('Invalid provider');
    }

    // @ts-ignore
    if (integrationProvider[body.name]) {
      try {
        // @ts-ignore
        const load = await integrationProvider[body.name](
          getIntegration.token,
          body.data,
          getIntegration.internalId,
          getIntegration
        );

        return load;
      } catch (err) {
        if (err instanceof RefreshToken) {
          const { accessToken, refreshToken, expiresIn, additionalSettings } =
            await integrationProvider.refreshToken(getIntegration.refreshToken);

          if (accessToken) {
            await this._integrationService.createOrUpdateIntegration(
              additionalSettings,
              !!integrationProvider.oneTimeToken,
              getIntegration.organizationId,
              getIntegration.name,
              getIntegration.picture!,
              'social',
              getIntegration.internalId,
              getIntegration.providerIdentifier,
              accessToken,
              refreshToken,
              expiresIn
            );

            getIntegration.token = accessToken;

            if (integrationProvider.refreshWait) {
              await timer(10000);
            }
            return this.functionIntegration(org, body);
          } else {
            await this._integrationService.disconnectChannel(
              org.id,
              getIntegration
            );
            return false;
          }
        }

        return false;
      }
    }
    throw new Error('Function not found');
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

    const integrationProvider =
      this._integrationManager.getSocialIntegration(integration);

    const getCodeVerifier = integrationProvider.customFields
      ? 'none'
      : await ioRedis.get(`login:${body.state}`);
    if (!getCodeVerifier) {
      throw new Error('Invalid state');
    }

    if (!integrationProvider.customFields) {
      await ioRedis.del(`login:${body.state}`);
    }

    const details = integrationProvider.externalUrl
      ? await ioRedis.get(`external:${body.state}`)
      : undefined;

    if (details) {
      await ioRedis.del(`external:${body.state}`);
    }

    const refresh = await ioRedis.get(`refresh:${body.state}`);
    if (refresh) {
      await ioRedis.del(`refresh:${body.state}`);
    }

    const {
      error,
      accessToken,
      expiresIn,
      refreshToken,
      id,
      name,
      picture,
      username,
      additionalSettings,
      // eslint-disable-next-line no-async-promise-executor
    } = await new Promise<AuthTokenDetails>(async (res) => {
      const auth = await integrationProvider.authenticate(
        {
          code: body.code,
          codeVerifier: getCodeVerifier,
          refresh: body.refresh,
        },
        details ? JSON.parse(details) : undefined
      );

      if (typeof auth === 'string') {
        return res({
          error: auth,
          accessToken: '',
          id: '',
          name: '',
          picture: '',
          username: '',
          additionalSettings: [],
        });
      }

      if (refresh && integrationProvider.reConnect) {
        const newAuth = await integrationProvider.reConnect(
          auth.id,
          refresh,
          auth.accessToken
        );
        return res(newAuth);
      }

      return res(auth);
    });

    if (error) {
      throw new NotEnoughScopes(error);
    }

    if (!id) {
      throw new NotEnoughScopes('Invalid API key');
    }

    if (refresh && String(id) !== String(refresh)) {
      throw new NotEnoughScopes(
        'Please refresh the channel that needs to be refreshed'
      );
    }

    let validName = name;
    if (!validName) {
      if (username) {
        validName = username.split('.')[0] ?? username;
      } else {
        validName = `Channel_${String(id).slice(0, 8)}`;
      }
    }
    return this._integrationService.createOrUpdateIntegration(
      additionalSettings,
      !!integrationProvider.oneTimeToken,
      org.id,
      validName.trim(),
      picture,
      'social',
      String(id),
      integration,
      accessToken,
      refreshToken,
      expiresIn,
      username,
      refresh ? false : integrationProvider.isBetweenSteps,
      body.refresh,
      +body.timezone,
      details
        ? AuthService.fixedEncryption(details)
        : integrationProvider.customFields
        ? AuthService.fixedEncryption(
            Buffer.from(body.code, 'base64').toString()
          )
        : undefined
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

  @Get('/plug/list')
  async getPlugList() {
    return { plugs: this._integrationManager.getAllPlugs() };
  }

  @Get('/:id/plugs')
  async getPlugsByIntegrationId(
    @Param('id') id: string,
    @GetOrgFromRequest() org: Organization
  ) {
    return this._integrationService.getPlugsByIntegrationId(org.id, id);
  }

  @Post('/:id/plugs')
  async postPlugsByIntegrationId(
    @Param('id') id: string,
    @GetOrgFromRequest() org: Organization,
    @Body() body: PlugDto
  ) {
    return this._integrationService.createOrUpdatePlug(org.id, id, body);
  }

  @Put('/plugs/:id/activate')
  async changePlugActivation(
    @Param('id') id: string,
    @GetOrgFromRequest() org: Organization,
    @Body('status') status: boolean
  ) {
    return this._integrationService.changePlugActivation(org.id, id, status);
  }

  @Get('/telegram/updates')
  async getUpdates(@Query() query: { word: string; id?: number }) {
    return new TelegramProvider().getBotId(query);
  }
}
