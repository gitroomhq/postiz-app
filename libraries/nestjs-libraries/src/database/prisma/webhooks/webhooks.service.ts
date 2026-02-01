import { Injectable, Logger } from '@nestjs/common';
import { WebhooksRepository } from '@gitroom/nestjs-libraries/database/prisma/webhooks/webhooks.repository';
import { WebhooksDto } from '@gitroom/nestjs-libraries/dtos/webhooks/webhooks.dto';

export type PostWebhookEvent =
  | 'post.created'
  | 'post.updated'
  | 'post.deleted'
  | 'post.published'
  | 'post.failed';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(private _webhooksRepository: WebhooksRepository) {}

  getTotal(orgId: string) {
    return this._webhooksRepository.getTotal(orgId);
  }

  getWebhooks(orgId: string) {
    return this._webhooksRepository.getWebhooks(orgId);
  }

  createWebhook(orgId: string, body: WebhooksDto) {
    return this._webhooksRepository.createWebhook(orgId, body);
  }

  deleteWebhook(orgId: string, id: string) {
    return this._webhooksRepository.deleteWebhook(orgId, id);
  }

  /**
   * Sends a post-related event to all configured webhooks for the org that match the integration.
   * Webhooks with no integrations configured receive all events; otherwise only when integrationId matches.
   */
  async sendPostEvent(
    orgId: string,
    integrationId: string,
    event: PostWebhookEvent,
    data: Record<string, unknown>
  ): Promise<void> {
    let webhooks: Awaited<ReturnType<WebhooksRepository['getWebhooks']>>;
    try {
      webhooks = (await this._webhooksRepository.getWebhooks(orgId)).filter(
        (w) =>
          w.integrations.length === 0 ||
          w.integrations.some((i) => i.integration.id === integrationId)
      );
    } catch (err) {
      this.logger.error(
        `Failed to load webhooks for org ${orgId}: ${err instanceof Error ? err.message : String(err)}`,
        err instanceof Error ? err.stack : undefined
      );
      return;
    }

    if (webhooks.length === 0) {
      this.logger.debug(
        `No webhooks configured for org ${orgId} (integration ${integrationId}), event ${event}`
      );
      return;
    }

    const payload = {
      event,
      timestamp: new Date().toISOString(),
      data,
    };

    this.logger.log(
      `Sending webhook event ${event} to ${webhooks.length} endpoint(s) (orgId=${orgId})`
    );

    const results = await Promise.allSettled(
      webhooks.map((webhook: (typeof webhooks)[number]) =>
        fetch(webhook.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      )
    );

    results.forEach(
      (result: PromiseSettledResult<Response>, index: number) => {
        const webhook = webhooks[index];
        if (result.status === 'fulfilled') {
          const res = result.value;
          if (!res.ok) {
            this.logger.warn(
              `Webhook ${webhook.url} returned ${res.status} for event ${event} (orgId=${orgId}, webhookId=${webhook.id})`
            );
          } else {
            this.logger.debug(
              `Webhook delivered to ${webhook.url} for event ${event} (webhookId=${webhook.id})`
            );
          }
        } else {
          this.logger.error(
            `Webhook failed for ${webhook.url} (event=${event}, orgId=${orgId}, webhookId=${webhook.id}): ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`,
            result.reason instanceof Error ? result.reason.stack : undefined
          );
        }
      }
    );
  }
}
