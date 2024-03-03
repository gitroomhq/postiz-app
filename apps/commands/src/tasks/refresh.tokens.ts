import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { IntegrationService } from '@gitroom/nestjs-libraries/database/prisma/integrations/integration.service';

@Injectable()
export class RefreshTokens {
  constructor(private _integrationService: IntegrationService) {}
  @Command({
    command: 'refresh',
    describe: 'Refresh all tokens',
  })
  async refresh() {
    await this._integrationService.refreshTokens();
    return true;
  }
}
