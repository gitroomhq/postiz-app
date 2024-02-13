import { Module } from '@nestjs/common';

import { StarsController } from './stars.controller';
import {RedisModule} from "@gitroom/nestjs-libraries/redis/redis.module";
import {DatabaseModule} from "@gitroom/nestjs-libraries/database/prisma/database.module";
import {BullMqModule} from "@gitroom/nestjs-libraries/bull-mq-transport/bull-mq.module";
import {ioRedis} from "@gitroom/nestjs-libraries/redis/redis.service";
import {TrendingService} from "@gitroom/nestjs-libraries/services/trending.service";

@Module({
  imports: [RedisModule, DatabaseModule, BullMqModule.forRoot({
    connection: ioRedis
  })],
  controllers: [StarsController],
  providers: [TrendingService],
})
export class AppModule {}
