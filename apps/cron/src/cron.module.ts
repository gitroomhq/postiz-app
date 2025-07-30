import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from '@gitroom/nestjs-libraries/database/prisma/database.module';
import { BullMqModule } from '@gitroom/nestjs-libraries/bull-mq-transport-new/bull.mq.module';
import { SentryModule } from '@sentry/nestjs/setup';
import { FILTER } from '@gitroom/nestjs-libraries/sentry/sentry.exception';

@Module({
  imports: [
    SentryModule.forRoot(),
    DatabaseModule,
    ScheduleModule.forRoot(),
    BullMqModule,
  ],
  controllers: [],
  providers: [
    FILTER
  ],
})
export class CronModule {}
