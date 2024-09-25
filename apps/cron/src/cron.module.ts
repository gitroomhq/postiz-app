import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CheckStars } from '@gitroom/cron/tasks/check.stars';
import { DatabaseModule } from '@gitroom/nestjs-libraries/database/prisma/database.module';
import { SyncTrending } from '@gitroom/cron/tasks/sync.trending';
import { BullMqModule } from '@gitroom/nestjs-libraries/bull-mq-transport-new/bull.mq.module';

@Module({
  imports: [DatabaseModule, ScheduleModule.forRoot(), BullMqModule],
  controllers: [],
  providers: [...(!process.env.IS_GENERAL ? [CheckStars, SyncTrending] : [])],
})
export class CronModule {}
