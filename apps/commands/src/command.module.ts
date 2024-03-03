import { Module } from '@nestjs/common';
import { CommandModule as ExternalCommandModule } from 'nestjs-command';
import { CheckStars } from './tasks/check.stars';
import { DatabaseModule } from '@gitroom/nestjs-libraries/database/prisma/database.module';
import { RedisModule } from '@gitroom/nestjs-libraries/redis/redis.module';
import { BullMqModule } from '@gitroom/nestjs-libraries/bull-mq-transport/bull-mq.module';
import { ioRedis } from '@gitroom/nestjs-libraries/redis/redis.service';
import {RefreshTokens} from "./tasks/refresh.tokens";

@Module({
  imports: [
    ExternalCommandModule,
    DatabaseModule,
    RedisModule,
    BullMqModule.forRoot({
      connection: ioRedis,
    }),
  ],
  controllers: [],
  providers: [CheckStars, RefreshTokens],
  get exports() {
    return [...this.imports, ...this.providers];
  },
})
export class CommandModule {}
