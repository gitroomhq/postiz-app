import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GetUserFromRequest } from '@gitroom/nestjs-libraries/user/user.from.request';
import { Organization, User } from '@prisma/client';
import { SocialMediaPlatformConfigDto } from '@gitroom/nestjs-libraries/dtos/social-media-platform/social-media-platform-config';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { SocialMediaPlatformConfigService } from '@gitroom/nestjs-libraries/database/prisma/social-media-platform-config/social-media-platform-config.service';

@ApiTags('Social Media Platform Config')
@Controller('/social-media-platform-config')
export class SocialMediaPlatformConfigController {
  constructor(private _socialMediaPlatformConfigService: SocialMediaPlatformConfigService) {}



  @Get('/')
  getPlatformConfigList(
    @GetUserFromRequest() user: User,
    @GetOrgFromRequest() organization: Organization,
    @Query('customerId') customerId?: string,
  ) {
    return this._socialMediaPlatformConfigService.getPlatformConfigList(organization.id, customerId);
  }


  @Get('/:platformKey')
  getPlatformConfig(
    @GetUserFromRequest() user: User,
    @GetOrgFromRequest() organization: Organization,
    @Param('platformKey') platformKey: string,
    @Query('customerId') customerId: string,
  ) {
    return this._socialMediaPlatformConfigService.getPlatformConfig(platformKey, organization.id, customerId);
  }


  @Post('/:platformKey')
  updateConfig(
    @GetUserFromRequest() user: User,
    @GetOrgFromRequest() organization: Organization,
    @Param('platformKey') platformKey: string,
    @Body() config: SocialMediaPlatformConfigDto
  ) {
    return this._socialMediaPlatformConfigService.updatePlatformConfig(platformKey, organization.id, config);
  }
}
