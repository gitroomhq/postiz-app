import { __decorate } from "tslib";
import { Global, Module } from '@nestjs/common';
import { DatabaseModule } from "../../../libraries/nestjs-libraries/src/database/prisma/database.module";
import { ApiModule } from "./api/api.module";
import { APP_GUARD } from '@nestjs/core';
import { PoliciesGuard } from "./services/auth/permissions/permissions.guard";
import { PublicApiModule } from "./public-api/public.api.module";
import { ThrottlerBehindProxyGuard } from "../../../libraries/nestjs-libraries/src/throttler/throttler.provider";
import { ThrottlerModule } from '@nestjs/throttler';
import { AgentModule } from "../../../libraries/nestjs-libraries/src/agent/agent.module";
import { ThirdPartyModule } from "../../../libraries/nestjs-libraries/src/3rdparties/thirdparty.module";
import { VideoModule } from "../../../libraries/nestjs-libraries/src/videos/video.module";
import { SentryModule } from '@sentry/nestjs/setup';
import { FILTER } from "../../../libraries/nestjs-libraries/src/sentry/sentry.exception";
import { ChatModule } from "../../../libraries/nestjs-libraries/src/chat/chat.module";
import { getTemporalModule } from "../../../libraries/nestjs-libraries/src/temporal/temporal.module";
import { TemporalRegisterMissingSearchAttributesModule } from "../../../libraries/nestjs-libraries/src/temporal/temporal.register";
import { InfiniteWorkflowRegisterModule } from "../../../libraries/nestjs-libraries/src/temporal/infinite.workflow.register";
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { ioRedis } from "../../../libraries/nestjs-libraries/src/redis/redis.service";
let AppModule = class AppModule {
};
AppModule = __decorate([
    Global(),
    Module({
        imports: [
            SentryModule.forRoot(),
            DatabaseModule,
            ApiModule,
            PublicApiModule,
            AgentModule,
            ThirdPartyModule,
            VideoModule,
            ChatModule,
            getTemporalModule(false),
            TemporalRegisterMissingSearchAttributesModule,
            InfiniteWorkflowRegisterModule,
            ThrottlerModule.forRoot({
                throttlers: [
                    {
                        ttl: 3600000,
                        limit: process.env.API_LIMIT ? Number(process.env.API_LIMIT) : 30,
                    },
                ],
                storage: new ThrottlerStorageRedisService(ioRedis),
            }),
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
            DatabaseModule,
            ApiModule,
            PublicApiModule,
            AgentModule,
            ThrottlerModule,
            ChatModule,
        ],
    })
], AppModule);
export { AppModule };
//# sourceMappingURL=app.module.js.map