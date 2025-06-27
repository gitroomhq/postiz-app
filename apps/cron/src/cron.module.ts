import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CheckStars } from '@chaolaolo/cron/tasks/check.stars';
import { DatabaseModule } from '@chaolaolo/nestjs-libraries/database/prisma/database.module';
import { SyncTrending } from '@chaolaolo/cron/tasks/sync.trending';
import { BullMqModule } from '@chaolaolo/nestjs-libraries/bull-mq-transport-new/bull.mq.module';

@Module({
  imports: [DatabaseModule, ScheduleModule.forRoot(), BullMqModule],
  controllers: [],
  providers: [...(!process.env.IS_GENERAL ? [CheckStars, SyncTrending] : [])],
})
export class CronModule { }
