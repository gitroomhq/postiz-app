import { Module } from '@nestjs/common';

import {DatabaseModule} from "@gitroom/nestjs-libraries/database/prisma/database.module";
import {RedisModule} from "@gitroom/nestjs-libraries/redis/redis.module";
import {AuthService} from "@gitroom/backend/services/auth/auth.service";
import {ApiModule} from "@gitroom/backend/api/api.module";

@Module({
  imports: [DatabaseModule, RedisModule, ApiModule],
  controllers: [],
  providers: [AuthService],
  get exports() {
    return [...this.imports, ...this.providers];
  }
})
export class AppModule {}
