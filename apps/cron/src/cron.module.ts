import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CheckStars } from '@gitroom/cron/tasks/check.stars';
import { DatabaseModule } from '@gitroom/nestjs-libraries/database/prisma/database.module';
import { SyncTrending } from '@gitroom/cron/tasks/sync.trending';
import { BullMqModule } from '@gitroom/nestjs-libraries/bull-mq-transport-new/bull.mq.module';
import { InstagramInsightsTask } from './tasks/instagram.insights';
import { YoutubeInsightsTask } from './tasks/youtube.insights';
import { FacebookInsightsTask } from './tasks/facebook.insights';
import { ThreadsInsightsTask } from './tasks/threads.insights';
import { LinkedInInsightsTask } from './tasks/linkedin.insights';
import { XInsightsTask } from './tasks/x-insights.task';
import { GBPInsightsTask } from './tasks/gbp.insights';

@Module({
  imports: [DatabaseModule, ScheduleModule.forRoot(), BullMqModule],
  controllers: [],
  providers: [...(!process.env.IS_GENERAL ? [CheckStars, SyncTrending, LinkedInInsightsTask, InstagramInsightsTask, YoutubeInsightsTask, FacebookInsightsTask, ThreadsInsightsTask, XInsightsTask,GBPInsightsTask ] : [])],
})
export class CronModule { }
