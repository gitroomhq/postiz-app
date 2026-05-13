import { Injectable } from '@nestjs/common';
import { Activity, ActivityMethod } from 'nestjs-temporal-core';
import { InboxService } from '@gitroom/nestjs-libraries/database/prisma/inbox/inbox.service';
import { IntegrationRepository } from '@gitroom/nestjs-libraries/database/prisma/integrations/integration.repository';

@Injectable()
@Activity()
export class InboxActivity {
  constructor(
    private _inboxService: InboxService,
    private _integrationRepository: IntegrationRepository
  ) {}

  @ActivityMethod()
  async syncAllInboxes(orgId: string) {
    const integrations =
      await this._integrationRepository.getIntegrationsList(orgId);

    for (const integration of integrations) {
      try {
        await this._inboxService.syncIntegration(integration.id);
      } catch (err) {
        console.error(`Inbox sync failed for ${integration.id}:`, err);
      }
    }
  }
}
