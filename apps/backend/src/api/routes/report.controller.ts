import { Controller, Delete, Get, Param, Query } from '@nestjs/common';
import { ReportService } from '../../services/report/report.service';
import { ApiTags } from '@nestjs/swagger';
@ApiTags('Reports')

@Controller('report')
export class ReportController {
  constructor(private readonly reportService: ReportService) { }


  @Get('instagram/community')
  getInstagramCommunityReport(
    @Query('businessId') businessId: string,
    @Query('days') days: string | '7' | '30' | '90' = '7'
  ) {
    return this.reportService.getInstagramCommunityReport(businessId, days);
  }

  @Get('instagram/overview')
  getInstagramOverviewReport(
    @Query('businessId') businessId: string,
    @Query('days') days: string | '7' | '30' | '90' = '7'
  ) {
    return this.reportService.getInstagramOverviewReport(businessId, days);
  }
  ////////////////////////////////////////////////////////////////////////////////

  @Get('x/community')
  getXCommunityReport(
    @Query('businessId') businessId: string,
    @Query('days') days: string | '7' | '30' | '90' = '7'
  ) {
    return this.reportService.getXCommunityReport(businessId, days);
  }

  @Get('x/overview')
  getXOverviewReport(
    @Query('businessId') businessId: string,
    @Query('days') days: string | '7' | '30' | '90' = '7'
  ) {
    return this.reportService.getXOverviewReport(businessId, days);
  }

  ////////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////

  @Get('x/list')
  xList(
    @Query('businessId') businessId: string,
  ) {
    return this.reportService.instagramInsightList(businessId);
  }


  @Get('instagramInsight/list')
  instagramInsightList(
    @Query('businessId') businessId: string,
  ) {
    return this.reportService.instagramInsightList(businessId);
  }

  @Delete('instagramInsight/:id')
  async deleteInstagramInsight(
    @Param('id') id: string,
  ) {
    return this.reportService.deleteInstagramInsight(id);
  }

  ////////////////////////////////////////////////////////////////////////////////
  // youtube.controller.ts

  @Get('youtube/overview')
  getYoutubeOverviewReport(
    @Query('businessId') businessId: string,
    @Query('days') days: string | '7' | '30' | '90' = '7'
  ) {
    return this.reportService.getYoutubeOverviewReport(businessId, days);
  }

  @Get('youtube/insights/list')
  youtubeInsightList(@Query('businessId') businessId: string) {
    return this.reportService.youtubeInsightList(businessId);
  }

  @Delete('youtube/insights/:id')
  async deleteYoutubeInsight(@Param('id') id: string) {
    return this.reportService.deleteYoutubeInsight(id);
  }
  ////////////////////////////////////////////////////////////////////////////////

  @Get('facebook/overview')
  getFacebookOverviewReport(
    @Query('businessId') businessId: string,
    @Query('days') days: string | '7' | '30' | '90' = '7'
  ) {
    return this.reportService.getFacebookOverviewReport(businessId, days);
  }

  @Get('facebook/community')
  getFacebookCommunityReport(
    @Query('businessId') businessId: string,
    @Query('days') days: string | '7' | '30' | '90' = '7'
  ) {
    return this.reportService.getFacebookCommunityReport(businessId, days);
  }

  @Get('facebookInsight/list')
  facebookInsightList(
    @Query('businessId') businessId: string,
  ) {
    return this.reportService.facebookInsightList(businessId);
  }

  @Delete('facebookInsight/:id')
  async deleteFacebookInsight(
    @Param('id') id: string,
  ) {
    return this.reportService.deleteFacebookInsight(id);
  }
  ////////////////////////////////////////////////////////////////////////////

  @Get('threads/growth')
  getThreadsGrowthReport(
    @Query('accountId') accountId: string,
    @Query('months') months: number = 3
  ) {
    return this.reportService.getThreadsGrowthReport(accountId, months);
  }

  @Get('threads/performance')
  getThreadsPerformanceReport(
    @Query('accountId') accountId: string,
    @Query('months') months: number = 3
  ) {
    return this.reportService.getThreadsPerformanceReport(accountId, months);
  }
  /////////////////////////////////////////////////////////////////////////////////////
  // Update controller methods to use accountId
  @Get('linkedin/overview')
  getLinkedInOverviewReport(
    @Query('businessId') businessId: string,
    @Query('days') days: string | '7' | '30' | '90' = '7'
  ) {
    return this.reportService.getLinkedInOverviewReport(businessId, days);
  }

  @Get('linkedin/community')
  getLinkedInCommunityReport(
    @Query('businessId') businessId: string,
    @Query('days') days: string | '7' | '30' | '90' = '7'
  ) {
    return this.reportService.getLinkedInCommunityReport(businessId, days);
  }

  @Get('linkedinInsight/list')
  linkedInInsightList(
    @Query('businessId') businessId: string,
  ) {
    return this.reportService.linkedInInsightList(businessId);
  }

}
