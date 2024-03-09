import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { RefreshTokens } from '@gitroom/cron/tasks/refresh.tokens';
import { CheckStars } from '@gitroom/cron/tasks/check.stars';
import { DatabaseModule } from '@gitroom/nestjs-libraries/database/prisma/database.module';
import { RedisModule } from '@gitroom/nestjs-libraries/redis/redis.module';
import { BullMqModule } from '@gitroom/nestjs-libraries/bull-mq-transport/bull-mq.module';
import { ioRedis } from '@gitroom/nestjs-libraries/redis/redis.service';
import { SyncTrending } from '@gitroom/cron/tasks/sync.trending';

@Module({
  imports: [
    DatabaseModule,
    ScheduleModule.forRoot(),
    RedisModule,
    BullMqModule.forRoot({
      connection: ioRedis,
    }),
  ],
  controllers: [],
  providers: [RefreshTokens, CheckStars, SyncTrending],
})
export class CronModule {}
