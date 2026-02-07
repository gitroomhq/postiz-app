import {
  Global,
  Module,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { PrismaClient } from '@prisma/client';

import { PublishPostProcessor } from './processors/publish-post.processor';
import { GenerateContentProcessor } from './processors/generate-content.processor';
import { ProcessImageProcessor } from './processors/process-image.processor';
import { RefreshTokenProcessor } from './processors/refresh-token.processor';
import { AnalyticsSyncProcessor } from './processors/analytics-sync.processor';

// ─── Inline PrismaService (same pattern as backend DatabaseModule) ───

export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
class DatabaseModule {}

// ─── Worker Root Module ───

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
        },
      }),
    }),

    // Register all queues
    BullModule.registerQueue(
      { name: 'publish-post' },
      { name: 'generate-content' },
      { name: 'process-image' },
      { name: 'refresh-token' },
      { name: 'analytics-sync' },
    ),

    DatabaseModule,
  ],

  providers: [
    PublishPostProcessor,
    GenerateContentProcessor,
    ProcessImageProcessor,
    RefreshTokenProcessor,
    AnalyticsSyncProcessor,
  ],
})
export class WorkerModule {}
