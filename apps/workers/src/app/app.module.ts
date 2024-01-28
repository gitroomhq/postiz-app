import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import {RedisModule} from "@gitroom/nestjs-libraries/redis/redis.module";
import {DatabaseModule} from "@gitroom/nestjs-libraries/database/prisma/database.module";

@Module({
  imports: [RedisModule, DatabaseModule],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
