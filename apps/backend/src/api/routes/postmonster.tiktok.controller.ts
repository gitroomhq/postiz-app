// postmonster: TikTok Direct Post composer endpoints (PRD 8.2, TT-01/TT-02).
// GET creator-info backs the composer "Posting to" block and the can-post
// gate; the provider caches creator_info/query responses for <= 60 seconds.

import {
  Controller,
  Get,
  NotFoundException,
  Param,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Integration, Organization } from '@prisma/client';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { IntegrationManager } from '@gitroom/nestjs-libraries/integrations/integration.manager';
import { IntegrationService } from '@gitroom/nestjs-libraries/database/prisma/integrations/integration.service';
import { RefreshIntegrationService } from '@gitroom/nestjs-libraries/integrations/refresh.integration.service';
import {
  Disconnect,
  RefreshToken,
} from '@gitroom/nestjs-libraries/integrations/social.abstract';
import { TiktokProvider } from '@gitroom/nestjs-libraries/integrations/social/tiktok.provider';
import {
  cantPostMessage,
  TikTokCantPostError,
} from '@gitroom/nestjs-libraries/postmonster/tiktok/tiktok.validation';

@ApiTags('TikTok')
@Controller('/integrations/tiktok')
export class PostmonsterTiktokController {
  constructor(
    private _integrationManager: IntegrationManager,
    private _integrationService: IntegrationService,
    private _refreshIntegrationService: RefreshIntegrationService
  ) {}

  // TT-01: latest creator info (avatar TTL 2h on TikTok's side, so the
  // composer always refetches on open and we cache only for a minute).
  // TT-02: when the account can not post right now the response carries
  // canPost:false with the exact user-facing message.
  @Get('/:integrationId/creator-info')
  async creatorInfo(
    @GetOrgFromRequest() org: Organization,
    @Param('integrationId') integrationId: string
  ) {
    const integration = await this._integrationService.getIntegrationById(
      org.id,
      integrationId
    );
    if (!integration || integration.providerIdentifier !== 'tiktok') {
      throw new NotFoundException('TikTok channel not found');
    }

    return this.loadCreatorInfo(org.id, integration);
  }

  private async loadCreatorInfo(
    orgId: string,
    integration: Integration,
    retried = false
  ): Promise<any> {
    const provider = this._integrationManager.getSocialIntegration(
      'tiktok'
    ) as TiktokProvider;

    try {
      const creator = await provider.queryCreatorInfo(integration.token);
      return { ok: true, canPost: true, creator };
    } catch (err) {
      // TT-02: error.code with HTTP 200 - the account can not post now
      if (err instanceof TikTokCantPostError) {
        return {
          ok: true,
          canPost: false,
          creator: null,
          message: cantPostMessage(),
        };
      }

      // Token revoked while downloading: channel needs a reconnect (TT-20)
      if (err instanceof Disconnect) {
        await this._integrationService.disconnectChannel(orgId, integration);
        return {
          ok: false,
          reconnect: true,
          message:
            'Your TikTok session has expired. Please reconnect the TikTok channel.',
        };
      }

      if (err instanceof RefreshToken && !retried) {
        const data = await this._refreshIntegrationService.refresh(integration);
        if (data && data.accessToken) {
          return this.loadCreatorInfo(
            orgId,
            { ...integration, token: data.accessToken },
            true
          );
        }
        await this._integrationService.disconnectChannel(orgId, integration);
        return {
          ok: false,
          reconnect: true,
          message:
            'Your TikTok session has expired. Please reconnect the TikTok channel.',
        };
      }

      return {
        ok: false,
        message:
          (err as any)?.message || 'Could not load TikTok account info. Please try again.',
      };
    }
  }
}
