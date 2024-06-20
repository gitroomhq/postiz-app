import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CheckStars } from '@gitroom/cron/tasks/check.stars';
import { DatabaseModule } from '@gitroom/nestjs-libraries/database/prisma/database.module';
import { BullMqModule } from '@gitroom/nestjs-libraries/bull-mq-transport/bull-mq.module';
import { ioRedis } from '@gitroom/nestjs-libraries/redis/redis.service';
import { SyncTrending } from '@gitroom/cron/tasks/sync.trending';

@Module({
  imports: [
    DatabaseModule,
    ScheduleModule.forRoot(),
    BullMqModule.forRoot({
      connection: ioRedis,
    }),
  ],
  controllers: [],
  providers: [CheckStars, SyncTrending],
})
export class CronModule {}
