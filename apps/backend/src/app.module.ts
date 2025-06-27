import { Global, Module } from '@nestjs/common';

import { DatabaseModule } from '@chaolaolo/nestjs-libraries/database/prisma/database.module';
import { ApiModule } from '@chaolaolo/backend/api/api.module';
import { APP_GUARD } from '@nestjs/core';
import { PoliciesGuard } from '@chaolaolo/backend/services/auth/permissions/permissions.guard';
import { BullMqModule } from '@chaolaolo/nestjs-libraries/bull-mq-transport-new/bull.mq.module';
import { PluginModule } from '@chaolaolo/plugins/plugin.module';
import { PublicApiModule } from '@chaolaolo/backend/public-api/public.api.module';
import { ThrottlerBehindProxyGuard } from '@chaolaolo/nestjs-libraries/throttler/throttler.provider';
import { ThrottlerModule } from '@nestjs/throttler';
import { AgentModule } from '@chaolaolo/nestjs-libraries/agent/agent.module';
import { McpModule } from '@chaolaolo/backend/mcp/mcp.module';
import { ThirdPartyModule } from '@chaolaolo/nestjs-libraries/3rdparties/thirdparty.module';

@Global()
@Module({
  imports: [
    BullMqModule,
    DatabaseModule,
    ApiModule,
    PluginModule,
    PublicApiModule,
    AgentModule,
    McpModule,
    ThirdPartyModule,
    ThrottlerModule.forRoot([
      {
        ttl: 3600000,
        limit: process.env.API_LIMIT ? Number(process.env.API_LIMIT) : 30,
      },
    ]),
  ],
  controllers: [],
  providers: [
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
    PluginModule,
    PublicApiModule,
    AgentModule,
    McpModule,
    ThrottlerModule,
  ],
})
export class AppModule { }
