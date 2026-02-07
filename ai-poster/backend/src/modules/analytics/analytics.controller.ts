import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  async overview(@CurrentUser() user: AuthUser) {
    return this.analyticsService.getOverview(user.organizationId);
  }

  @Get('posts/:postId')
  async postAnalytics(
    @CurrentUser() user: AuthUser,
    @Param('postId') postId: string,
  ) {
    return this.analyticsService.getPostAnalytics(user.organizationId, postId);
  }

  @Get('channels/:integrationId')
  async channelAnalytics(
    @CurrentUser() user: AuthUser,
    @Param('integrationId') integrationId: string,
    @Query('start') start?: string,
    @Query('end') end?: string,
  ) {
    return this.analyticsService.getChannelAnalytics(
      user.organizationId,
      integrationId,
      start ? new Date(start) : undefined,
      end ? new Date(end) : undefined,
    );
  }
}
