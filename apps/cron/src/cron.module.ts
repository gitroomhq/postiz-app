import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CheckStars } from '@gitroom/cron/tasks/check.stars';
import { DatabaseModule } from '@gitroom/nestjs-libraries/database/prisma/database.module';
import { SyncTrending } from '@gitroom/cron/tasks/sync.trending';
import { BullMqModule } from '@gitroom/nestjs-libraries/bull-mq-transport-new/bull.mq.module';
import { InstagramInsightsTask } from './tasks/instagram.insights';
import { XInsightsTask } from './tasks/x-insights.task';

@Module({
  imports: [DatabaseModule, ScheduleModule.forRoot(), BullMqModule],
  controllers: [],
  providers: [...(!process.env.IS_GENERAL ? [CheckStars,SyncTrending,InstagramInsightsTask,XInsightsTask] : [])]
})
export class CronModule {}
