import { Injectable } from '@nestjs/common';
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
    const org = await this._organizationService.getOrgById(organizationId);
    if (!org) {
      throw new Error('Organization not found');
    }

    return this._mediaService.generateVideo(org, body);
  }
}
