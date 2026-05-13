import { Injectable } from '@nestjs/common';
import { InboxRepository } from '@gitroom/nestjs-libraries/database/prisma/inbox/inbox.repository';
import { IntegrationManager } from '@gitroom/nestjs-libraries/integrations/integration.manager';
import { IntegrationRepository } from '@gitroom/nestjs-libraries/database/prisma/integrations/integration.repository';
import { Organization } from '@prisma/client';
import { TemporalService } from 'nestjs-temporal-core';

@Injectable()
export class InboxService {
  constructor(
    private _inboxRepository: InboxRepository,
    private _integrationManager: IntegrationManager,
    private _integrationRepository: IntegrationRepository,
    private _temporalService: TemporalService
  ) {}

  async syncIntegration(integrationId: string) {
    const integration =
      await this._integrationRepository.getIntegrationByIdOnly(integrationId);
    if (!integration || integration.disabled || integration.deletedAt) return;

    const provider = this._integrationManager.getSocialIntegration(
      integration.providerIdentifier
    );
    if (!provider?.fetchInbox) return;

    const last = await this._inboxRepository.getLastSyncTime(integrationId);
    const since = last?.createdAt ?? undefined;

    const items = await provider.fetchInbox(
      integration.internalId,
      integration.token,
      integration,
      since
    );

    if (items.length === 0) return;

    await this._inboxRepository.upsertItems(
      integration.organizationId,
      integrationId,
      integration.providerIdentifier,
      items
    );
  }

  getItems(org: Organization, params: { platform?: string; type?: string; unreadOnly?: boolean; page?: number }) {
    return this._inboxRepository.getItems(org.id, params);
  }

  getUnreadCount(org: Organization) {
    return this._inboxRepository.getUnreadCount(org.id);
  }

  async markRead(org: Organization, id: string) {
    await this._inboxRepository.markRead(org.id, id);
  }

  async startInboxWorkflow(organizationId: string) {
    try {
      await this._temporalService.client
        .getRawClient()
        ?.workflow.start('inboxSyncWorkflow', {
          workflowId: `inbox_sync_${organizationId}`,
          taskQueue: 'main',
          workflowIdConflictPolicy: 'USE_EXISTING',
          args: [{ organizationId }],
        });
    } catch (err) {}
  }

  async reply(org: Organization, id: string, message: string) {
    const item = await this._inboxRepository.findById(org.id, id);
    if (!item) throw new Error('Inbox item not found');

    const provider = this._integrationManager.getSocialIntegration(
      item.integration.providerIdentifier
    );
    if (!provider?.comment) throw new Error('Provider does not support replies');

    await provider.comment(
      item.integration.internalId,
      item.postId || item.externalId,
      item.externalId,
      item.integration.token,
      [{ id, message, settings: {} }],
      item.integration
    );

    await this._inboxRepository.markReplied(org.id, id);
  }
}
