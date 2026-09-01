import { HttpException, Injectable } from '@nestjs/common';
import { Activity, ActivityMethod } from 'nestjs-temporal-core';
import { MediaService } from '@gitroom/nestjs-libraries/database/prisma/media/media.service';
import { OrganizationService } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.service';
import { VideoDto } from '@gitroom/nestjs-libraries/dtos/videos/video.dto';

@Injectable()
@Activity()
export class VideoActivity {
  constructor(
    private _mediaService: MediaService,
    private _organizationService: OrganizationService
  ) {}

  @ActivityMethod()
  async generateVideo(organizationId: string, body: VideoDto) {
    // credits are checked against the subscription, so it has to be loaded with the org
    const org = await this._organizationService.getOrgByIdWithSubscription(
      organizationId
    );
    if (!org) {
      throw new Error('Organization not found');
    }

    try {
      return await this._mediaService.generateVideo(org, body);
    } catch (err) {
      // only the message survives the workflow failure, and a SubscriptionException's is not readable
      if (err instanceof HttpException && err.getStatus() === 402) {
        throw new Error('No AI video credits are available on this account.');
      }
      throw err;
    }
  }
}
