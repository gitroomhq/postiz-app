import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Organization } from '@prisma/client';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { FacebookAdsService } from '@gitroom/nestjs-libraries/database/prisma/facebook-ads/facebook.ads.service';
import {
  CreateFacebookAdDto,
  CreateFacebookAdGroupDto,
  CreateFacebookCampaignDto,
  FacebookAdsConnectDto,
  SelectFacebookAdsContextDto,
} from '@gitroom/nestjs-libraries/dtos/facebook-ads/facebook.ads.dto';

@ApiTags('Facebook Ads')
@Controller('/facebook-ads')
export class FacebookAdsController {
  constructor(private readonly facebookAds: FacebookAdsService) {}

  @Get('/catalog')
  catalog() {
    return this.facebookAds.catalog();
  }

  @Get('/auth-url')
  authUrl() {
    return this.facebookAds.authUrl();
  }

  @Get('/status')
  status(@GetOrgFromRequest() org: Organization) {
    return this.facebookAds.status(org.id);
  }

  @Post('/connect')
  connect(@GetOrgFromRequest() org: Organization, @Body() body: FacebookAdsConnectDto) {
    return this.facebookAds.connect(org.id, body.code);
  }

  @Get('/businesses')
  businesses(@GetOrgFromRequest() org: Organization) {
    return this.facebookAds.listBusinesses(org.id);
  }

  @Get('/ad-accounts')
  adAccounts(
    @GetOrgFromRequest() org: Organization,
    @Query('businessId') businessId?: string
  ) {
    return this.facebookAds.listAdAccounts(org.id, businessId);
  }

  @Post('/select')
  select(@GetOrgFromRequest() org: Organization, @Body() body: SelectFacebookAdsContextDto) {
    return this.facebookAds.selectContext(org.id, body);
  }

  @Get('/pages')
  pages(@GetOrgFromRequest() org: Organization) {
    return this.facebookAds.listPages(org.id);
  }

  @Get('/campaigns')
  campaigns(@GetOrgFromRequest() org: Organization) {
    return this.facebookAds.listCampaigns(org.id);
  }

  @Post('/campaigns')
  createCampaign(
    @GetOrgFromRequest() org: Organization,
    @Body() body: CreateFacebookCampaignDto
  ) {
    return this.facebookAds.createCampaign(org.id, body);
  }

  @Get('/ad-groups')
  adGroups(@GetOrgFromRequest() org: Organization) {
    return this.facebookAds.listAdGroups(org.id);
  }

  @Post('/ad-groups')
  createAdGroup(
    @GetOrgFromRequest() org: Organization,
    @Body() body: CreateFacebookAdGroupDto
  ) {
    return this.facebookAds.createAdGroup(org.id, body);
  }

  @Get('/ads')
  ads(@GetOrgFromRequest() org: Organization) {
    return this.facebookAds.listAds(org.id);
  }

  @Post('/ads')
  createAd(@GetOrgFromRequest() org: Organization, @Body() body: CreateFacebookAdDto) {
    return this.facebookAds.createAd(org.id, body);
  }
}