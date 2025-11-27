import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { IntegrationRepository } from '@gitroom/nestjs-libraries/database/prisma/integrations/integration.repository';
import { IntegrationManager } from '@gitroom/nestjs-libraries/integrations/integration.manager';
import { InstagramProvider } from '@gitroom/nestjs-libraries/integrations/social/instagram.provider';
import { FacebookProvider } from '@gitroom/nestjs-libraries/integrations/social/facebook.provider';
import {
  AnalyticsData,
  AuthTokenDetails,
  SocialProvider,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import { Integration, Organization } from '@prisma/client';
import { NotificationService } from '@gitroom/nestjs-libraries/database/prisma/notifications/notification.service';
import { LinkedinPageProvider } from '@gitroom/nestjs-libraries/integrations/social/linkedin.page.provider';
import dayjs from 'dayjs';
import { timer } from '@gitroom/helpers/utils/timer';
import { ioRedis } from '@gitroom/nestjs-libraries/redis/redis.service';
import { RefreshToken } from '@gitroom/nestjs-libraries/integrations/social.abstract';
import { IntegrationTimeDto } from '@gitroom/nestjs-libraries/dtos/integrations/integration.time.dto';
import { UploadFactory } from '@gitroom/nestjs-libraries/upload/upload.factory';
import { PlugDto } from '@gitroom/nestjs-libraries/dtos/plugs/plug.dto';
import { BullMqClient } from '@gitroom/nestjs-libraries/bull-mq-transport-new/client';
import { difference, uniq } from 'lodash';
import utc from 'dayjs/plugin/utc';
import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
dayjs.extend(utc);

@Injectable()
export class IntegrationService {
  private storage = UploadFactory.createStorage();
  constructor(
    private _integrationRepository: IntegrationRepository,
    private _integrationManager: IntegrationManager,
    private _notificationService: NotificationService,
    private _workerServiceProducer: BullMqClient,
    private _socialTokenRepo: PrismaRepository<'socialToken'>
  ) {}

  async setTimes(
    orgId: string,
    integrationId: string,
    times: IntegrationTimeDto
  ) {
    return this._integrationRepository.setTimes(orgId, integrationId, times);
  }

  updateProviderSettings(org: string, id: string, additionalSettings: string) {
    return this._integrationRepository.updateProviderSettings(
      org,
      id,
      additionalSettings
    );
  }

  async createOrUpdateIntegration(
    additionalSettings:
      | {
          title: string;
          description: string;
          type: 'checkbox' | 'text' | 'textarea';
          value: any;
          regex?: string;
        }[]
      | undefined,
    oneTimeToken: boolean,
    org: string,
    customerId: string | null,
    name: string,
    picture: string | undefined,
    type: 'article' | 'social',
    internalId: string,
    provider: string,
    token: string,
    refreshToken = '',
    expiresIn?: number,
    username?: string,
    isBetweenSteps = false,
    refresh?: string,
    timezone?: number,
    customInstanceDetails?: string
  ) {
    const uploadedPicture = picture
      ? picture?.indexOf('imagedelivery.net') > -1
        ? picture
        : await this.storage.uploadSimple(picture)
      : undefined;

    const integration = await this._integrationRepository.createOrUpdateIntegration(
      additionalSettings,
      oneTimeToken,
      org,
      customerId,
      name,
      uploadedPicture,
      type,
      internalId,
      provider,
      token,
      refreshToken,
      expiresIn,
      username,
      isBetweenSteps,
      refresh,
      timezone,
      customInstanceDetails
    );

    // Sync tokens to SocialToken table for social providers that need it
    if (type === 'social' && (token || refreshToken)) {
      await this.syncTokensToSocialTokenTable(
        org,
        customerId,
        internalId,
        name,
        provider,
        token,
        refreshToken,
        expiresIn
      );
    }

    return integration;
  }

  /**
   * Sync tokens from Integration table to SocialToken table
   * This ensures that the refresh token cron job can find the tokens
   */
  private async syncTokensToSocialTokenTable(
    orgId: string,
    customerId: string | null,
    internalId: string,
    name: string,
    provider: string,
    accessToken: string,
    refreshToken: string,
    expiresIn?: number
  ) {
    // Only sync tokens for providers that use the SocialToken table
    const providersUsingSocialToken = ['gbp', 'instagram', 'website', 'linkedin', 'youtube', 'x', 'facebook'];
    
    if (!providersUsingSocialToken.includes(provider)) {
      return;
    }

    const tokenExpiry = expiresIn 
      ? new Date(Date.now() + expiresIn * 1000)
      : undefined;

    try {
      // First try to find existing record
      const existingToken = await this._socialTokenRepo.model.socialToken.findUnique({
        where: {
          identifier_businessId: {
            identifier: provider,
            businessId: internalId,
          }
        }
      });

      if (existingToken) {
        // Update existing record
        await this._socialTokenRepo.model.socialToken.update({
          where: {
            id: existingToken.id
          },
          data: {
            name: name,
            organizationId: orgId,
            accessToken: accessToken || null,
            refreshToken: refreshToken || null,
            tokenExpiry: tokenExpiry,
            updatedAt: new Date(),
          },
        });
      } else {
        // Create new record
        await this._socialTokenRepo.model.socialToken.create({
          data: {
            identifier: provider,
            name: name,
            businessId: internalId,
            organizationId: orgId,
            accessToken: accessToken || null,
            refreshToken: refreshToken || null,
            tokenExpiry: tokenExpiry,
          },
        });
      }
    } catch (error) {
      console.error(`Failed to sync tokens for provider ${provider}:`, error);
    }
  }

  updateIntegrationGroup(org: string, id: string, group: string) {
    return this._integrationRepository.updateIntegrationGroup(org, id, group);
  }

  updateOnCustomerName(org: string, id: string, name: string) {
    return this._integrationRepository.updateOnCustomerName(org, id, name);
  }

  getIntegrationsList(org: string) {
    return this._integrationRepository.getIntegrationsList(org);
  }

  getIntegrationForOrder(id: string, order: string, user: string, org: string) {
    return this._integrationRepository.getIntegrationForOrder(
      id,
      order,
      user,
      org
    );
  }

  updateNameAndUrl(id: string, name: string, url: string) {
    return this._integrationRepository.updateNameAndUrl(id, name, url);
  }

  getIntegrationById(org: string, id: string) {
    return this._integrationRepository.getIntegrationById(org, id);
  }

  async refreshToken(provider: SocialProvider, refresh: string) {
    try {
      const { refreshToken, accessToken, expiresIn } =
        await provider.refreshToken(refresh);

      if (!refreshToken || !accessToken || !expiresIn) {
        return false;
      }

      return { refreshToken, accessToken, expiresIn };
    } catch (e) {
      console.error('Token refresh failed:', e);
      return false;
    }
  }

  async disconnectChannel(orgId: string, integration: Integration) {
    await this._integrationRepository.disconnectChannel(orgId, integration.id);
    await this.informAboutRefreshError(orgId, integration);
  }

  async informAboutRefreshError(orgId: string, integration: Integration) {
    await this._notificationService.inAppNotification(
      orgId,
      `Could not refresh your ${integration.providerIdentifier} channel`,
      `Could not refresh your ${integration.providerIdentifier} channel. Please go back to the system and connect it again ${process.env.FRONTEND_URL}/launches`,
      true
    );
  }

  async refreshNeeded(org: string, id: string) {
    return this._integrationRepository.refreshNeeded(org, id);
  }

  async refreshTokens() {
    const integrations = await this._integrationRepository.needsToBeRefreshed();
    for (const integration of integrations) {
      try {
        const provider = await this._integrationManager.getSocialIntegration(
          integration.providerIdentifier,
          integration.organizationId,
          integration.customerId
        );

        const data = await this.refreshToken(provider, integration.refreshToken!);

        if (!data) {
          await this.informAboutRefreshError(
            integration.organizationId,
            integration
          );
          await this._integrationRepository.refreshNeeded(
            integration.organizationId,
            integration.id
          );
          continue; // Continue with next integration instead of returning
        }

        const { refreshToken, accessToken, expiresIn } = data;

        await this.createOrUpdateIntegration(
          undefined,
          !!provider.oneTimeToken,
          integration.organizationId,
          integration.customerId,
          integration.name,
          undefined,
          'social',
          integration.internalId,
          integration.providerIdentifier,
          accessToken,
          refreshToken,
          expiresIn
        );
      } catch (error) {
        console.error(`Failed to refresh token for integration ${integration.id}:`, error);
        await this.informAboutRefreshError(
          integration.organizationId,
          integration
        );
        await this._integrationRepository.refreshNeeded(
          integration.organizationId,
          integration.id
        );
      }
    }
  }

  async disableChannel(org: string, id: string) {
    return this._integrationRepository.disableChannel(org, id);
  }

  async enableChannel(org: string, totalChannels: number, id: string) {
    const integrations = (
      await this._integrationRepository.getIntegrationsList(org)
    ).filter((f) => !f.disabled);
    if (integrations.length >= totalChannels) {
      throw new Error('You have reached the maximum number of channels');
    }

    return this._integrationRepository.enableChannel(org, id);
  }

  async getPostsForChannel(org: string, id: string) {
    return this._integrationRepository.getPostsForChannel(org, id);
  }

  async deleteChannel(org: string, id: string) {
    return this._integrationRepository.deleteChannel(org, id);
  }

  async disableIntegrations(org: string, totalChannels: number) {
    return this._integrationRepository.disableIntegrations(org, totalChannels);
  }

  async checkForDeletedOnceAndUpdate(org: string, page: string) {
    return this._integrationRepository.checkForDeletedOnceAndUpdate(org, page);
  }

  async saveInstagram(
    org: string,
    id: string,
    data: { pageId: string; id: string }
  ) {
    const getIntegration = await this._integrationRepository.getIntegrationById(
      org,
      id
    );
    if (getIntegration && !getIntegration.inBetweenSteps) {
      throw new HttpException('Invalid request', HttpStatus.BAD_REQUEST);
    }

    const instagram = await this._integrationManager.getSocialIntegration(
      'instagram',
      getIntegration?.organizationId,
      getIntegration?.customerId
    ) as InstagramProvider;
    const getIntegrationInformation = await instagram.fetchPageInformation(
      getIntegration?.token!,
      data
    );

    await this.checkForDeletedOnceAndUpdate(org, getIntegrationInformation.id);
    await this._integrationRepository.updateIntegration(id, {
      picture: getIntegrationInformation.picture,
      internalId: getIntegrationInformation.id,
      name: getIntegrationInformation.name,
      inBetweenSteps: false,
      token: getIntegrationInformation.access_token,
      profile: getIntegrationInformation.username,
    });

    return { success: true };
  }

  async saveLinkedin(org: string, id: string, page: string) {
    const getIntegration = await this._integrationRepository.getIntegrationById(
      org,
      id
    );
    if (getIntegration && !getIntegration.inBetweenSteps) {
      throw new HttpException('Invalid request', HttpStatus.BAD_REQUEST);
    }

    const linkedin = await this._integrationManager.getSocialIntegration(
      'linkedin-page',
      getIntegration?.organizationId,
      getIntegration?.customerId
    ) as LinkedinPageProvider;

    const getIntegrationInformation = await linkedin.fetchPageInformation(
      getIntegration?.token!,
      page
    );

    await this.checkForDeletedOnceAndUpdate(
      org,
      String(getIntegrationInformation.id)
    );

    await this._integrationRepository.updateIntegration(String(id), {
      picture: getIntegrationInformation.picture,
      internalId: String(getIntegrationInformation.id),
      name: getIntegrationInformation.name,
      inBetweenSteps: false,
      token: getIntegrationInformation.access_token,
      profile: getIntegrationInformation.username,
    });

    return { success: true };
  }

  async saveFacebook(org: string, id: string, page: string) {
    const getIntegration = await this._integrationRepository.getIntegrationById(
      org,
      id
    );
    if (getIntegration && !getIntegration.inBetweenSteps) {
      throw new HttpException('Invalid request', HttpStatus.BAD_REQUEST);
    }

    const facebook = await this._integrationManager.getSocialIntegration(
      'facebook',
      getIntegration?.organizationId,
      getIntegration?.customerId
    ) as FacebookProvider;
    const getIntegrationInformation = await facebook.fetchPageInformation(
      getIntegration?.token!,
      page
    );

    await this.checkForDeletedOnceAndUpdate(org, getIntegrationInformation.id);

    // Store user token with page ID in refresh token format: userToken::pageId
    const userToken = getIntegration?.token!; // This is the user token
    const pageId = getIntegrationInformation.id;
    const formattedRefreshToken = `${userToken}::${pageId}`;

    await this._integrationRepository.updateIntegration(id, {
      picture: getIntegrationInformation.picture,
      internalId: getIntegrationInformation.id,
      name: getIntegrationInformation.name,
      inBetweenSteps: false,
      token: getIntegrationInformation.access_token, // Page token
      refreshToken: formattedRefreshToken, // User token with page ID
      profile: getIntegrationInformation.username,
    });

    return { success: true };
  }

  async checkAnalytics(
    org: Organization,
    integration: string,
    date: string,
    forceRefresh = false
  ): Promise<AnalyticsData[]> {
    const getIntegration = await this.getIntegrationById(org.id, integration);

    if (!getIntegration) {
      throw new Error('Invalid integration');
    }

    if (getIntegration.type !== 'social') {
      return [];
    }

    const integrationProvider = await this._integrationManager.getSocialIntegration(
      getIntegration.providerIdentifier,
      getIntegration.organizationId,
      getIntegration.customerId
    );

    if (
      dayjs(getIntegration?.tokenExpiration).isBefore(dayjs()) ||
      forceRefresh
    ) {
      const { accessToken, expiresIn, refreshToken, additionalSettings } =
        await new Promise<AuthTokenDetails>((res) => {
          return integrationProvider
            .refreshToken(getIntegration.refreshToken!)
            .then((r) => res(r))
            .catch(() => {
              res({
                error: '',
                accessToken: '',
                id: '',
                name: '',
                picture: '',
                username: '',
                additionalSettings: undefined,
              });
            });
        });

      if (accessToken) {
        await this.createOrUpdateIntegration(
          additionalSettings,
          !!integrationProvider.oneTimeToken,
          getIntegration.organizationId,
          getIntegration.customerId,
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
      } else {
        await this.disconnectChannel(org.id, getIntegration);
        return [];
      }
    }

    const getIntegrationData = await ioRedis.get(
      `integration:${org.id}:${integration}:${date}`
    );
    if (getIntegrationData) {
      return JSON.parse(getIntegrationData);
    }

    if (integrationProvider.analytics) {
      try {
        const loadAnalytics = await integrationProvider.analytics(
          getIntegration.internalId,
          getIntegration.token,
          +date
        );
        await ioRedis.set(
          `integration:${org.id}:${integration}:${date}`,
          JSON.stringify(loadAnalytics),
          'EX',
          !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
            ? 1
            : 3600
        );
        return loadAnalytics;
      } catch (e) {
        if (e instanceof RefreshToken) {
          return this.checkAnalytics(org, integration, date, true);
        }
      }
    }

    return [];
  }

  customers(orgId: string) {
    return this._integrationRepository.customers(orgId);
  }

  getRefreshTokenIntegration(orgId: string, refreshToken: string) {
    return this._integrationRepository.getRefreshTokenIntegration(orgId, refreshToken);
  }

  getPlugsByIntegrationId(org: string, integrationId: string) {
    return this._integrationRepository.getPlugsByIntegrationId(
      org,
      integrationId
    );
  }

  async processInternalPlug(data: {
    post: string;
    originalIntegration: string;
    integration: string;
    plugName: string;
    orgId: string;
    delay: number;
    information: any;
  }) {
    const originalIntegration =
      await this._integrationRepository.getIntegrationById(
        data.orgId,
        data.originalIntegration
      );

    const getIntegration = await this._integrationRepository.getIntegrationById(
      data.orgId,
      data.integration
    );

    if (!getIntegration || !originalIntegration) {
      return;
    }

    const getAllInternalPlugs = this._integrationManager
      .getInternalPlugs(getIntegration.providerIdentifier)
      .internalPlugs.find((p: any) => p.identifier === data.plugName);

    if (!getAllInternalPlugs) {
      return;
    }

    const getSocialIntegration = await this._integrationManager.getSocialIntegration(
      getIntegration.providerIdentifier,
      getIntegration.organizationId,
      getIntegration.customerId
    );

    try {
      // @ts-ignore
      await getSocialIntegration?.[getAllInternalPlugs.methodName]?.(
        getIntegration,
        originalIntegration,
        data.post,
        data.information
      );
    } catch (err) {
      return;
    }
  }

  async processPlugs(data: {
    plugId: string;
    postId: string;
    delay: number;
    totalRuns: number;
    currentRun: number;
  }) {
    const getPlugById = await this._integrationRepository.getPlug(data.plugId);
    if (!getPlugById) {
      return;
    }

    const integration = await this._integrationManager.getSocialIntegration(
      getPlugById.integration.providerIdentifier,
      getPlugById.integration.organizationId,
      getPlugById.integration.customerId
    );

    const findPlug = this._integrationManager
      .getAllPlugs()
      .find(
        (p) => p.identifier === getPlugById.integration.providerIdentifier
      )!;

    // @ts-ignore
    const process = await integration[getPlugById.plugFunction](
      getPlugById.integration,
      data.postId,
      JSON.parse(getPlugById.data).reduce((all: any, current: any) => {
        all[current.name] = current.value;
        return all;
      }, {})
    );

    if (process) {
      return;
    }

    if (data.totalRuns === data.currentRun) {
      return;
    }

    this._workerServiceProducer.emit('plugs', {
      id: 'plug_' + data.postId + '_' + findPlug.identifier,
      options: {
        delay: 0, // runPlug.runEveryMilliseconds,
      },
      payload: {
        plugId: data.plugId,
        postId: data.postId,
        delay: data.delay,
        totalRuns: data.totalRuns,
        currentRun: data.currentRun + 1,
      },
    });
  }

  async createOrUpdatePlug(
    orgId: string,
    integrationId: string,
    body: PlugDto
  ) {
    const { activated } = await this._integrationRepository.createOrUpdatePlug(
      orgId,
      integrationId,
      body
    );

    return {
      activated,
    };
  }

  async changePlugActivation(orgId: string, plugId: string, status: boolean) {
    const { id, integrationId, plugFunction } =
      await this._integrationRepository.changePlugActivation(
        orgId,
        plugId,
        status
      );

    return { id };
  }

  async getPlugs(orgId: string, integrationId: string) {
    return this._integrationRepository.getPlugs(orgId, integrationId);
  }

  async loadExisingData(
    methodName: string,
    integrationId: string,
    id: string[]
  ) {
    const exisingData = await this._integrationRepository.loadExisingData(
      methodName,
      integrationId,
      id
    );
    const loadOnlyIds = exisingData.map((p) => p.value);
    return difference(id, loadOnlyIds);
  }

  async findFreeDateTime(orgId: string): Promise<number[]> {
    const findTimes = await this._integrationRepository.getPostingTimes(orgId);
    return uniq(
      findTimes.reduce((all: any, current: any) => {
        return [
          ...all,
          ...JSON.parse(current.postingTimes).map(
            (p: { time: number }) => p.time
          ),
        ];
      }, [] as number[])
    );
  }
}
