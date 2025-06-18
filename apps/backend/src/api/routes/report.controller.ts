import { Controller, Delete, Get, Param, Query } from '@nestjs/common';
import { ReportService } from '../../services/report/report.service';

@Controller('report')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

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

}
