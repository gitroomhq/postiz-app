import {Global, Module} from '@nestjs/common';

import {DatabaseModule} from "@gitroom/nestjs-libraries/database/prisma/database.module";
import {RedisModule} from "@gitroom/nestjs-libraries/redis/redis.module";
import {ApiModule} from "@gitroom/backend/api/api.module";
import {APP_GUARD} from "@nestjs/core";
import {PoliciesGuard} from "@gitroom/backend/services/auth/permissions/permissions.guard";

@Global()
@Module({
  imports: [DatabaseModule, RedisModule, ApiModule],
  controllers: [],
  providers: [{
    provide: APP_GUARD,
    useClass: PoliciesGuard
  }],
  get exports() {
    return [...this.imports];
  }
})
export class AppModule {}
