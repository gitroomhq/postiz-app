import { BadRequestException, Injectable } from '@nestjs/common';
import { AutomationRepository } from '@gitroom/nestjs-libraries/database/prisma/automations/automation.repository';
import { AutomationDto } from '@gitroom/nestjs-libraries/dtos/automations/automation.dto';
import { IntegrationManager } from '@gitroom/nestjs-libraries/integrations/integration.manager';
import { TemporalService } from 'nestjs-temporal-core';
import { Integration } from '@prisma/client';

export interface WebhookEvent {
  postId: string;
  commentId: string;
  text: string;
}

export interface WebhookRunItem {
  automationId: string;
  postId: string;
  commentId: string;
  text: string;
  methodName: string;
  integration: Integration;
  data: {
    keywords: string[];
    actions: { type: string; variations: string[] }[];
  };
}

@Injectable()
export class AutomationService {
  constructor(
    private _automationRepository: AutomationRepository,
    private _integrationManager: IntegrationManager,
    private _temporalService: TemporalService
  ) {}

  getAutomations(orgId: string, platform?: string) {
    return this._automationRepository.getAutomations(orgId, platform);
  }

  getAutomation(orgId: string, id: string) {
    return this._automationRepository.getAutomation(orgId, id);
  }

  async createOrUpdateAutomation(
    orgId: string,
    automation: AutomationDto,
    id?: string
  ) {
    const platformWebhooks = this._integrationManager
      .getAllWebhooks()
      .find((p) => p.identifier === automation.platform);
    if (
      !platformWebhooks?.webhooks?.some(
        (w: any) => w.methodName === automation.automationFunction
      )
    ) {
      throw new BadRequestException(
        'Invalid platform or automation function'
      );
    }

    const saved = await this._automationRepository.createOrUpdateAutomation(
      orgId,
      automation,
      id
    );

    this.subscribePlatformWebhooks(orgId, automation.platform).catch(
      () => {}
    );

    return saved;
  }

  async changeAutomationActivation(orgId: string, id: string, status: boolean) {
    const automation =
      await this._automationRepository.changeAutomationActivation(
        orgId,
        id,
        status
      );

    if (status) {
      this.subscribePlatformWebhooks(orgId, automation.platform).catch(
        () => {}
      );
    }

    return automation;
  }

  // without subscribing each connected account to the app, Meta (and other
  // future platforms) will not send any webhook event for it
  async subscribePlatformWebhooks(orgId: string, platform: string) {
    const provider = this._integrationManager.getSocialIntegration(platform);
    if (!provider?.subscribeToWebhooks) {
      return;
    }

    const integrations =
      await this._automationRepository.getIntegrationsByPlatform(
        orgId,
        platform
      );

    for (const integration of integrations) {
      try {
        await provider.subscribeToWebhooks(integration);
      } catch (err) {
        console.error(
          `[automations] failed to subscribe ${platform} integration ${integration.id} to webhooks:`,
          err
        );
      }
    }
  }

  deleteAutomation(orgId: string, id: string) {
    return this._automationRepository.deleteAutomation(orgId, id);
  }

  async processWebhook(platform: string, payload: any) {
    const provider = this._integrationManager.getSocialIntegration(platform);
    const ids = provider?.webhookPostAndCommentId?.(payload);
    if (!ids) {
      return { received: true };
    }

    // platforms re-deliver webhooks they consider failed, the same comment
    // should never be processed twice
    if (
      !(await this._automationRepository.markEventProcessed(
        platform,
        ids.commentId
      ))
    ) {
      return { received: true };
    }

    if (Math.random() < 0.01) {
      this._automationRepository.deleteOldProcessedEvents().catch(() => {});
    }

    try {
      await this._temporalService.client
        .getRawClient()
        ?.workflow.signalWithStart('processWebhooks', {
          workflowId: `process-webhooks-${platform}`,
          taskQueue: 'main',
          signal: 'newWebhookEvent',
          signalArgs: [ids],
          args: [
            {
              taskQueue: platform.split('-')[0],
              platform,
            },
          ],
        });
    } catch (err) {
      // if the event can not be queued, release the dedup reservation and
      // fail the request, so the platform will re-deliver it later
      await this._automationRepository
        .unmarkEventProcessed(platform, ids.commentId)
        .catch(() => {});
      throw err;
    }

    return { received: true, ...ids };
  }

  async matchWebhookEvents(
    platform: string,
    events: WebhookEvent[]
  ): Promise<WebhookRunItem[]> {
    const provider = this._integrationManager.getSocialIntegration(platform);
    if (!provider) {
      return [];
    }

    const posts = await this._automationRepository.getPostsByReleaseIds(
      platform,
      [...new Set(events.map((event) => event.postId))]
    );

    const webhooks =
      Reflect.getMetadata('custom:webhook', provider.constructor.prototype) ||
      [];

    const output: WebhookRunItem[] = [];
    for (const event of events) {
      const post = posts.find((p) => p.releaseId === event.postId);
      if (!post?.automation) {
        continue;
      }

      const webhook = webhooks.find(
        (w: any) => w.methodName === post.automation!.automationFunction
      );
      if (!webhook) {
        continue;
      }

      // older automations stored the actions array directly
      const parsed = JSON.parse(post.automation.data);
      const data = Array.isArray(parsed)
        ? { keywords: [], actions: parsed }
        : { keywords: parsed.keywords || [], actions: parsed.actions || [] };

      output.push({
        automationId: post.automation.id,
        postId: post.id,
        commentId: event.commentId,
        text: event.text,
        methodName: webhook.methodName,
        integration: post.integration,
        data,
      });
    }

    return output;
  }

  async runWebhook(platform: string, item: WebhookRunItem) {
    const provider = this._integrationManager.getSocialIntegration(platform);
    if (!provider) {
      return;
    }

    // only methods that are decorated with @Webhook can be triggered
    const webhooks =
      Reflect.getMetadata('custom:webhook', provider.constructor.prototype) ||
      [];
    if (!webhooks.some((w: any) => w.methodName === item.methodName)) {
      return;
    }

    // the workflow catches refresh_token failures, refreshes the token and
    // runs the item again, everything else should stay short in here
    return (provider as any)[item.methodName](item.integration, item.data, {
      id: item.commentId,
      text: item.text,
    });
  }
}
