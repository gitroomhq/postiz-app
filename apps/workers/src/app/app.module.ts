import { Module } from '@nestjs/common';

import { StarsController } from './stars.controller';
import {DatabaseModule} from "@gitroom/nestjs-libraries/database/prisma/database.module";
import {BullMqModule} from "@gitroom/nestjs-libraries/bull-mq-transport/bull-mq.module";
import {ioRedis} from "@gitroom/nestjs-libraries/redis/redis.service";
import {TrendingService} from "@gitroom/nestjs-libraries/services/trending.service";
import {PostsController} from "@gitroom/workers/app/posts.controller";

@Module({
  imports: [DatabaseModule, BullMqModule.forRoot({
    connection: ioRedis
  })],
  controllers: [StarsController, PostsController],
  providers: [TrendingService],
})
export class AppModule {}
