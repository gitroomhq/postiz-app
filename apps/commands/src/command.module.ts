import { Module } from '@nestjs/common';
import { CommandModule as ExternalCommandModule } from 'nestjs-command';
import { CheckStars } from './tasks/check.stars';
import { DatabaseModule } from '@gitroom/nestjs-libraries/database/prisma/database.module';
import { RefreshTokens } from './tasks/refresh.tokens';
import { BullMqModule } from '@gitroom/nestjs-libraries/bull-mq-transport-new/bull.mq.module';
import { ConfigurationTask } from './tasks/configuration';
import { AgentRun } from './tasks/agent.run';
import { AgentModule } from '@gitroom/nestjs-libraries/agent/agent.module';

@Module({
  imports: [ExternalCommandModule, DatabaseModule, BullMqModule, AgentModule],
  controllers: [],
  providers: [CheckStars, RefreshTokens, ConfigurationTask, AgentRun],
  get exports() {
    return [...this.imports, ...this.providers];
  },
})
export class CommandModule {}
