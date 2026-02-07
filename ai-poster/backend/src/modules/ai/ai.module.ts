import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { PromptBuilderService } from './prompt-builder.service';

@Module({
  controllers: [AiController],
  providers: [AiService, PromptBuilderService],
  exports: [AiService, PromptBuilderService],
})
export class AiModule {}
