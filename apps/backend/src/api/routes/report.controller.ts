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
    @Query('channelId') channelId: string,
    @Query('days') days: string | '7' | '30' | '90' = '7'
  ) {
    return this.reportService.getYoutubeOverviewReport(channelId, days);
  }

  @Get('youtube/insights/list')
  youtubeInsightList(@Query('channelId') channelId: string) {
    return this.reportService.youtubeInsightList(channelId);
  }

  @Delete('youtube/insights/:id')
  async deleteYoutubeInsight(@Param('id') id: string) {
    return this.reportService.deleteYoutubeInsight(id);
  }
  ////////////////////////////////////////////////////////////////////////////////

  @Get('facebook/overview')
  getFacebookOverviewReport(
    @Query('pageId') pageId: string,
    @Query('days') days: string | '7' | '30' | '90' = '7'
  ) {
    return this.reportService.getFacebookOverviewReport(pageId, days);
  }

  @Get('facebook/community')
  getFacebookCommunityReport(
    @Query('pageId') pageId: string,
    @Query('days') days: string | '7' | '30' | '90' = '7'
  ) {
    return this.reportService.getFacebookCommunityReport(pageId, days);
  }

  @Get('facebookInsight/list')
  facebookInsightList(
    @Query('pageId') pageId: string,
  ) {
    return this.reportService.facebookInsightList(pageId);
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
  // Add to your controller file
  @Get('linkedin/overview')
  getLinkedInOverviewReport(
    @Query('pageId') pageId: string,
    @Query('days') days: string | '7' | '30' | '90' = '7'
  ) {
    return this.reportService.getLinkedInOverviewReport(pageId, days);
  }

  @Get('linkedin/community')
  getLinkedInCommunityReport(
    @Query('pageId') pageId: string,
    @Query('days') days: string | '7' | '30' | '90' = '7'
  ) {
    return this.reportService.getLinkedInCommunityReport(pageId, days);
  }

  @Get('linkedinInsight/list')
  linkedInInsightList(
    @Query('pageId') pageId: string,
  ) {
    return this.reportService.linkedInInsightList(pageId);
  }

  @Delete('linkedinInsight/:id')
  async deleteLinkedInInsight(
    @Param('id') id: string,
  ) {
    return this.reportService.deleteLinkedInInsight(id);
  }

}
