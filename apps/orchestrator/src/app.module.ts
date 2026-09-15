import { Module } from '@nestjs/common';
import { PostActivity } from '@gitroom/orchestrator/activities/post.activity';
import { getTemporalModule } from '@gitroom/nestjs-libraries/temporal/temporal.module';
import { DatabaseModule } from '@gitroom/nestjs-libraries/database/prisma/database.module';
import { AutopostService } from '@gitroom/nestjs-libraries/database/prisma/autopost/autopost.service';
import { AutopostActivity } from '@gitroom/orchestrator/activities/autopost.activity';
import { EmailActivity } from '@gitroom/orchestrator/activities/email.activity';
import { IntegrationsActivity } from '@gitroom/orchestrator/activities/integrations.activity';
import { VideoActivity } from '@gitroom/orchestrator/activities/video.activity';
import { FoundingFeeActivity } from '@gitroom/orchestrator/activities/founding.fee.activity';
import { PostMetricsActivity } from '@gitroom/orchestrator/activities/post-metrics.activity';
import { VideoModule } from '@gitroom/nestjs-libraries/videos/video.module';
import { HealthController } from '@gitroom/orchestrator/health.controller';

// Activity classes handed to the Temporal worker. AutopostActivity is the one
// the autopost workflows call (`autoPost`); AutopostService, which was listed
// here instead, carries no activity methods, so the worker never registered
// `autoPost` and every autopost run failed at its first activity. A class must
// be in this list, not only in providers, for the worker to register it.
const activities = [
  PostActivity,
  AutopostActivity,
  EmailActivity,
  IntegrationsActivity,
  VideoActivity,
  FoundingFeeActivity,
  PostMetricsActivity,
];
@Module({
  imports: [
    DatabaseModule,
    VideoModule,
    getTemporalModule(true, require.resolve('./workflows'), activities),
  ],
  controllers: [HealthController],
  // AutopostService is not an activity, but AutopostActivity injects it.
  providers: [...activities, AutopostService],
  get exports() {
    return [...this.providers, ...this.imports];
  },
})
export class AppModule {}
