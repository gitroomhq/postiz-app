import { Injectable } from '@nestjs/common';
import { Activity, ActivityMethod } from 'nestjs-temporal-core';
import { PostMetricsService } from '@gitroom/nestjs-libraries/database/prisma/analytics/post-metrics.service';

@Injectable()
@Activity()
export class PostMetricsActivity {
  constructor(private _postMetricsService: PostMetricsService) {}

  @ActivityMethod()
  listPostMetricIntegrations(organizationId?: string) {
    return this._postMetricsService.listIntegrationsNeedingSync(
      organizationId
    );
  }

  @ActivityMethod()
  syncPostMetricsForIntegration(organizationId: string, integrationId: string) {
    return this._postMetricsService.syncIntegration(
      organizationId,
      integrationId
    );
  }
}
