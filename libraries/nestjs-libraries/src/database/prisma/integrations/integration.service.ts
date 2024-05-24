import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { IntegrationRepository } from '@gitroom/nestjs-libraries/database/prisma/integrations/integration.repository';
import { IntegrationManager } from '@gitroom/nestjs-libraries/integrations/integration.manager';
import { InstagramProvider } from '@gitroom/nestjs-libraries/integrations/social/instagram.provider';
import { FacebookProvider } from '@gitroom/nestjs-libraries/integrations/social/facebook.provider';

@Injectable()
export class IntegrationService {
  constructor(
    private _integrationRepository: IntegrationRepository,
    private _integrationManager: IntegrationManager
  ) {}
  createOrUpdateIntegration(
    org: string,
    name: string,
    picture: string,
    type: 'article' | 'social',
    internalId: string,
    provider: string,
    token: string,
    refreshToken = '',
    expiresIn?: number,
    username?: string,
    isBetweenSteps = false
  ) {
    return this._integrationRepository.createOrUpdateIntegration(
      org,
      name,
      picture,
      type,
      internalId,
      provider,
      token,
      refreshToken,
      expiresIn,
      username,
      isBetweenSteps
    );
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

  getIntegrationById(org: string, id: string) {
    return this._integrationRepository.getIntegrationById(org, id);
  }

  async refreshTokens() {
    const integrations = await this._integrationRepository.needsToBeRefreshed();
    for (const integration of integrations) {
      const provider = this._integrationManager.getSocialIntegration(
        integration.providerIdentifier
      );

      const { refreshToken, accessToken, expiresIn } =
        await provider.refreshToken(integration.refreshToken!);

      await this.createOrUpdateIntegration(
        integration.organizationId,
        integration.name,
        integration.picture!,
        'social',
        integration.internalId,
        integration.providerIdentifier,
        accessToken,
        refreshToken,
        expiresIn
      );
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

  async deleteChannel(org: string, id: string) {
    const isTherePosts = await this._integrationRepository.countPostsForChannel(
      org,
      id
    );
    if (isTherePosts) {
      throw new HttpException(
        'There are posts for this channel',
        HttpStatus.NOT_ACCEPTABLE
      );
    }

    return this._integrationRepository.deleteChannel(org, id);
  }

  async disableIntegrations(org: string, totalChannels: number) {
    return this._integrationRepository.disableIntegrations(org, totalChannels);
  }

  async checkForDeletedOnceAndUpdate(org: string, page: string) {
    return this._integrationRepository.checkForDeletedOnceAndUpdate(org, page);
  }

  async saveInstagram(org: string, id: string, data: { pageId: string, id: string }) {
    const getIntegration = await this._integrationRepository.getIntegrationById(
      org,
      id
    );
    if (getIntegration && !getIntegration.inBetweenSteps) {
      throw new HttpException('Invalid request', HttpStatus.BAD_REQUEST);
    }

    const instagram = this._integrationManager.getSocialIntegration(
      'instagram'
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

    const facebook = this._integrationManager.getSocialIntegration(
      'facebook'
    ) as FacebookProvider;
    const getIntegrationInformation = await facebook.fetchPageInformation(
      getIntegration?.token!,
      page
    );

    await this.checkForDeletedOnceAndUpdate(org, getIntegrationInformation.id);
    await this._integrationRepository.updateIntegration(id, {
      picture: getIntegrationInformation.picture,
      internalId: getIntegrationInformation.id,
      name: getIntegrationInformation.name,
      inBetweenSteps: false,
      token: getIntegrationInformation.access_token,
    });

    return { success: true };
  }
}
