import { Global, Module } from '@nestjs/common';

import { DatabaseModule } from '@gitroom/nestjs-libraries/database/prisma/database.module';
import { ApiModule } from '@gitroom/backend/api/api.module';
import { APP_GUARD } from '@nestjs/core';
import { PoliciesGuard } from '@gitroom/backend/services/auth/permissions/permissions.guard';
import { BullMqModule } from '@gitroom/nestjs-libraries/bull-mq-transport-new/bull.mq.module';
import { PluginModule } from '@gitroom/plugins/plugin.module';

@Global()
@Module({
  imports: [BullMqModule, DatabaseModule, ApiModule, PluginModule],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: PoliciesGuard,
    },
  ],
  get exports() {
    return [...this.imports];
  },
})
export class AppModule {}
