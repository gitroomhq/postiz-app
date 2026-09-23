import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { Integration } from '@prisma/client';
import { IntegrationManager } from '@gitroom/nestjs-libraries/integrations/integration.manager';
import { IntegrationService } from '@gitroom/nestjs-libraries/database/prisma/integrations/integration.service';
import {
  AuthTokenDetails,
  SocialProvider,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import { TemporalService } from 'nestjs-temporal-core';
import { safeStringify } from '@gitroom/nestjs-libraries/integrations/social.abstract';

@Injectable()
export class RefreshIntegrationService {
  constructor(
    private _integrationManager: IntegrationManager,
    @Inject(forwardRef(() => IntegrationService))
    private _integrationService: IntegrationService,
    private _temporalService: TemporalService
  ) {}
  async refresh(
    integration: Integration,
    cause = '',
    tolerateUnknownErrors = false
  ): Promise<false | AuthTokenDetails> {
    const socialProvider = this._integrationManager.getSocialIntegration(
      integration.providerIdentifier
    );

    const refresh = await this.refreshProcess(
      integration,
      socialProvider,
      cause,
      tolerateUnknownErrors
    );

    if (!refresh) {
      return false as const;
    }

    await this._integrationService.createOrUpdateIntegration(
      undefined,
      !!socialProvider.oneTimeToken,
      integration.organizationId,
      integration.name,
      integration.picture!,
      'social',
      integration.internalId,
      integration.providerIdentifier,
      refresh.accessToken,
      refresh.refreshToken,
      refresh.expiresIn
    );

    return refresh;
  }

  public async setBetweenSteps(integration: Integration, cause = '') {
    await this._integrationService.setBetweenRefreshSteps(integration.id);
    await this._integrationService.informAboutRefreshError(
      integration.organizationId,
      integration,
      cause
    );
  }

  public async startRefreshWorkflow(orgId: string, id: string, integration: SocialProvider) {
    if (!integration.refreshCron) {
      return false;
    }

    return this._temporalService.client
      .getRawClient()
      ?.workflow.start(`refreshTokenWorkflow`, {
        workflowId: `refresh_${id}`,
        args: [{integrationId: id, organizationId: orgId}],
        taskQueue: 'main',
        workflowIdConflictPolicy: 'TERMINATE_EXISTING',
      });
  }

  private async refreshProcess(
    integration: Integration,
    socialProvider: SocialProvider,
    cause = '',
    tolerateUnknownErrors = false
  ): Promise<AuthTokenDetails | false> {
    let refreshError: any = null;
    const refresh: false | AuthTokenDetails = await socialProvider
      .refreshToken(integration.refreshToken)
      .catch((err) => {
        refreshError = err;
        return false as const;
      });

    if (!refresh || !refresh.accessToken) {
      console.error(
        `Refresh failed for ${integration.providerIdentifier} (${integration.id}):`,
        refreshError || 'no access token returned'
      );

      // the scheduled refresh has no proof the token is dead, so transient /
      // unrecognized errors should not disconnect the channel there, only
      // errors the provider recognizes as an invalid refresh token. Every
      // other caller refreshes because the platform already rejected the
      // token, so they keep disconnecting.
      if (refreshError && tolerateUnknownErrors) {
        const handle = socialProvider.handleErrors?.(
          `${refreshError?.message || ''} ${safeStringify(refreshError)}`,
          refreshError?.status || refreshError?.response?.status || 0
        );

        if (handle?.type !== 'refresh-token') {
          return false;
        }
      }

      await this._integrationService.refreshNeeded(
        integration.organizationId,
        integration.id
      );

      await this._integrationService.informAboutRefreshError(
        integration.organizationId,
        integration,
        cause
      );

      await this._integrationService.disconnectChannel(
        integration.organizationId,
        integration
      );

      return false;
    }

    if (
      !socialProvider.reConnect ||
      integration.rootInternalId === integration.internalId
    ) {
      return refresh;
    }

    const reConnect = await socialProvider.reConnect(
      integration.rootInternalId,
      integration.internalId,
      refresh.accessToken
    );

    return {
      ...refresh,
      ...reConnect,
    };
  }
}
