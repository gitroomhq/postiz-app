import { Global, Module } from '@nestjs/common';
import { DatabaseModule } from '@gitroom/nestjs-libraries/database/prisma/database.module';
import { ApiModule } from '@gitroom/backend/api/api.module';
import { APP_GUARD } from '@nestjs/core';
import { PoliciesGuard } from '@gitroom/backend/services/auth/permissions/permissions.guard';
import { BullMqModule } from '@gitroom/nestjs-libraries/bull-mq-transport-new/bull.mq.module';
import { PublicApiModule } from '@gitroom/backend/public-api/public.api.module';
import { ThrottlerBehindProxyGuard } from '@gitroom/nestjs-libraries/throttler/throttler.provider';
import { ThrottlerModule } from '@nestjs/throttler';
import { AgentModule } from '@gitroom/nestjs-libraries/agent/agent.module';
import { ThirdPartyModule } from '@gitroom/nestjs-libraries/3rdparties/thirdparty.module';
import { VideoModule } from '@gitroom/nestjs-libraries/videos/video.module';
import { SentryModule } from '@sentry/nestjs/setup';
import { FILTER } from '@gitroom/nestjs-libraries/sentry/sentry.exception';
import { ChatModule } from '@gitroom/nestjs-libraries/chat/chat.module';

@Global()
@Module({
  imports: [
    SentryModule.forRoot(),
    BullMqModule,
    DatabaseModule,
    ApiModule,
    PublicApiModule,
    AgentModule,
    ThirdPartyModule,
    VideoModule,
    ChatModule,
    ThrottlerModule.forRoot([
      {
        ttl: 3600000,
        limit: process.env.API_LIMIT ? Number(process.env.API_LIMIT) : 30,
      },
    ]),
  ],
  controllers: [],
  providers: [
    FILTER,
    {
      provide: APP_GUARD,
      useClass: ThrottlerBehindProxyGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PoliciesGuard,
    },
  ],
  exports: [
    BullMqModule,
    DatabaseModule,
    ApiModule,
    PublicApiModule,
    AgentModule,
    ThrottlerModule,
    ChatModule,
  ],
})
export class AppModule {}
