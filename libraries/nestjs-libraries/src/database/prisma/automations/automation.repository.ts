import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { AutomationDto } from '@gitroom/nestjs-libraries/dtos/automations/automation.dto';

@Injectable()
export class AutomationRepository {
  constructor(
    private _automation: PrismaRepository<'automation'>,
    private _posts: PrismaRepository<'post'>,
    private _processedEvents: PrismaRepository<'automationProcessedEvent'>,
    private _integrations: PrismaRepository<'integration'>
  ) {}

  getPostsByReleaseIds(platform: string, releaseIds: string[]) {
    return this._posts.model.post.findMany({
      where: {
        releaseId: {
          in: releaseIds,
        },
        automationId: {
          not: null,
        },
        deletedAt: null,
        automation: {
          platform,
          activated: true,
          deletedAt: null,
        },
        integration: {
          providerIdentifier: platform,
        },
      },
      include: {
        automation: true,
        integration: true,
      },
    });
  }

  async markEventProcessed(platform: string, eventId: string) {
    try {
      await this._processedEvents.model.automationProcessedEvent.create({
        data: {
          platform,
          eventId,
        },
      });
      return true;
    } catch (err) {
      // unique constraint failed, the event was already processed
      return false;
    }
  }

  unmarkEventProcessed(platform: string, eventId: string) {
    return this._processedEvents.model.automationProcessedEvent.deleteMany({
      where: {
        platform,
        eventId,
      },
    });
  }

  deleteOldProcessedEvents() {
    return this._processedEvents.model.automationProcessedEvent.deleteMany({
      where: {
        createdAt: {
          lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
    });
  }

  getIntegrationsByPlatform(orgId: string, platform: string) {
    return this._integrations.model.integration.findMany({
      where: {
        organizationId: orgId,
        providerIdentifier: platform,
        deletedAt: null,
        disabled: false,
      },
    });
  }

  getAutomations(orgId: string, platform?: string) {
    return this._automation.model.automation.findMany({
      where: {
        organizationId: orgId,
        deletedAt: null,
        ...(platform ? { platform } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  getAutomation(orgId: string, id: string) {
    return this._automation.model.automation.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
    });
  }

  async createOrUpdateAutomation(
    orgId: string,
    automation: AutomationDto,
    id?: string
  ) {
    const values = {
      organizationId: orgId,
      name: automation.name,
      platform: automation.platform,
      automationFunction: automation.automationFunction,
      data: JSON.stringify({
        keywords: automation.keywords || [],
        actions: automation.actions,
      }),
    };

    const { id: updatedId } = await this._automation.model.automation.upsert({
      where: { id: id || uuidv4(), organizationId: orgId },
      update: values,
      create: values,
    });

    return { id: updatedId };
  }

  changeAutomationActivation(orgId: string, id: string, status: boolean) {
    return this._automation.model.automation.update({
      where: { id, organizationId: orgId },
      data: { activated: status },
    });
  }

  deleteAutomation(orgId: string, id: string) {
    return this._automation.model.automation.update({
      where: { id, organizationId: orgId },
      data: { deletedAt: new Date() },
    });
  }
}
