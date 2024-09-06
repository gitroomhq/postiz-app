import { Module } from '@nestjs/common';
import { CommandModule as ExternalCommandModule } from 'nestjs-command';
import { CheckStars } from './tasks/check.stars';
import { DatabaseModule } from '@gitroom/nestjs-libraries/database/prisma/database.module';
import { RefreshTokens } from './tasks/refresh.tokens';
import { BullMqModule } from '@gitroom/nestjs-libraries/bull-mq-transport-new/bull.mq.module';
import { ConfigurationTask } from './tasks/configuration';

@Module({
  imports: [ExternalCommandModule, DatabaseModule, BullMqModule],
  controllers: [],
  providers: [CheckStars, RefreshTokens, ConfigurationTask],
  get exports() {
    return [...this.imports, ...this.providers];
  },
})
export class CommandModule {}
