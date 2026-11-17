import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Organization } from '@prisma/client';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import {
  ApprovalService,
  CivicCampaignService,
  PublishService,
} from '@gitroom/nestjs-libraries/database/prisma/civic/civic.service';
import {
  ApproveCivicCampaignDto,
  CreateCivicCampaignDto,
  LinkPublishedCivicPostDto,
} from '@gitroom/nestjs-libraries/dtos/civic/create.civic.campaign.dto';

@ApiTags('Civic desk')
@Controller('/civic-desk')
export class CivicDeskController {
  constructor(
    private readonly campaigns: CivicCampaignService,
    private readonly approvals: ApprovalService,
    private readonly publish: PublishService
  ) {}

  @Get('/')
  list(@GetOrgFromRequest() org: Organization) {
    return this.campaigns.list(org.id);
  }

  @Post('/')
  create(@GetOrgFromRequest() org: Organization, @Body() body: CreateCivicCampaignDto) {
    return this.campaigns.create(org.id, body);
  }

  @Post('/:id/approve')
  approve(@GetOrgFromRequest() org: Organization, @Param('id') id: string, @Body() body: ApproveCivicCampaignDto) {
    return this.approvals.approve(org.id, id, body);
  }

  @Post('/:id/published-post')
  linkPublishedPost(@GetOrgFromRequest() org: Organization, @Param('id') id: string, @Body() body: LinkPublishedCivicPostDto) {
    return this.publish.linkPublishedPost(org.id, id, body);
  }

  @Post('/:id/ads-manager-handoff')
  handoff(@GetOrgFromRequest() org: Organization, @Param('id') id: string) {
    return this.campaigns.recordHandoff(org.id, id);
  }
}
