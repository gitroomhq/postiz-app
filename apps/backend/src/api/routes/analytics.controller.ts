import { Controller, Get, Param, Query } from '@nestjs/common';
import { Organization } from '@gitroom/nestjs-libraries/database/prisma/generated/client';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { ApiTags } from '@nestjs/swagger';
import { IntegrationService } from '@gitroom/nestjs-libraries/database/prisma/integrations/integration.service';
import { PostsService } from '@gitroom/nestjs-libraries/database/prisma/posts/posts.service';
import { PostMetricsService } from '@gitroom/nestjs-libraries/database/prisma/analytics/post-metrics.service';
import { GetAnalyticsPostsDto } from '@gitroom/nestjs-libraries/dtos/analytics/get.analytics.posts.dto';

@ApiTags('Analytics')
@Controller('/analytics')
export class AnalyticsController {
  constructor(
    private _integrationService: IntegrationService,
    private _postsService: PostsService,
    private _postMetricsService: PostMetricsService
  ) {}

  @Get('/posts')
  getPosts(
    @GetOrgFromRequest() org: Organization,
    @Query() query: GetAnalyticsPostsDto
  ) {
    return this._postMetricsService.listPosts(org.id, query);
  }

  @Get('/summary')
  getSummary(
    @GetOrgFromRequest() org: Organization,
    @Query() query: GetAnalyticsPostsDto
  ) {
    return this._postMetricsService.summary(org.id, query);
  }

  @Get('/snapshot/:postId')
  getSnapshot(
    @GetOrgFromRequest() org: Organization,
    @Param('postId') postId: string
  ) {
    return this._postMetricsService.getPost(org.id, postId);
  }

  @Get('/post/:postId')
  async getPostAnalytics(
    @GetOrgFromRequest() org: Organization,
    @Param('postId') postId: string,
    @Query('date') date: string
  ) {
    const live = await this._postsService.checkPostAnalytics(
      org.id,
      postId,
      +date
    );
    if (!Array.isArray(live) || live.length === 0) {
      return live;
    }
    return this._postMetricsService.postStatisticsSeries(
      org.id,
      postId,
      +date,
      live
    );
  }

  @Get('/:integration')
  async getIntegration(
    @GetOrgFromRequest() org: Organization,
    @Param('integration') integration: string,
    @Query('date') date: string
  ) {
    return this._integrationService.checkAnalytics(org, integration, date);
  }
}
