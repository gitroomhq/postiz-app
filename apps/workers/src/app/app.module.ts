import { Module } from '@nestjs/common';

import { StarsController } from './stars.controller';
import { DatabaseModule } from '@chaolaolo/nestjs-libraries/database/prisma/database.module';
import { TrendingService } from '@chaolaolo/nestjs-libraries/services/trending.service';
import { PostsController } from '@chaolaolo/workers/app/posts.controller';
import { BullMqModule } from '@chaolaolo/nestjs-libraries/bull-mq-transport-new/bull.mq.module';
import { PlugsController } from '@chaolaolo/workers/app/plugs.controller';

@Module({
  imports: [DatabaseModule, BullMqModule],
  controllers: [
    ...(!process.env.IS_GENERAL ? [StarsController] : []),
    PostsController,
    PlugsController,
  ],
  providers: [TrendingService],
})
export class AppModule { }
