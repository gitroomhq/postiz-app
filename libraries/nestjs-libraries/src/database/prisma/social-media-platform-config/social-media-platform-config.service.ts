import { Injectable } from '@nestjs/common';
import { SocialMediaPlatformConfigRepository } from './social-media-platform-config.repository';
import { SocialMediaPlatformConfigDto } from '@gitroom/nestjs-libraries/dtos/social-media-platform/social-media-platform-config';


@Injectable()
export class SocialMediaPlatformConfigService {
  constructor(
    private _socialMediaPlatformConfigRepository: SocialMediaPlatformConfigRepository,
  ) {}


  getPlatformConfigList(orgId: string, customerId:string|null) {
    return this._socialMediaPlatformConfigRepository.getPlatformConfigList(orgId, customerId);
  }

  getPlatformConfig(platformKey: string, orgId: string, customerId:string |null |undefined) {
    return this._socialMediaPlatformConfigRepository.getPlatformConfig(platformKey, orgId, customerId);
  }

  async updatePlatformConfig(
    platformKey: string,
    orgId: string,
    body: SocialMediaPlatformConfigDto
  ) {
    const config = await this._socialMediaPlatformConfigRepository.updatePlatformConfig(
      platformKey,
      orgId,
      body
    );

    return config;
  }


}
