import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../database.module';
import { WebhookEvent } from '@prisma/client';
import * as crypto from 'crypto';

const VALID_EVENTS: WebhookEvent[] = [
  'POST_CREATED',
  'POST_APPROVED',
  'POST_REJECTED',
  'POST_SCHEDULED',
  'POST_PUBLISHED',
  'POST_FAILED',
  'CAMPAIGN_CREATED',
  'CAMPAIGN_COMPLETED',
];

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(private readonly prisma: PrismaService) {}

  async list(organizationId: string) {
    return this.prisma.webhook.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(
    organizationId: string,
    data: { url: string; events: string[]; active?: boolean },
  ) {
    // Validate URL format
    try {
      new URL(data.url);
    } catch {
      throw new BadRequestException('Invalid webhook URL');
    }

    // Validate events
    const invalidEvents = data.events.filter(
      (e) => !VALID_EVENTS.includes(e as WebhookEvent),
    );
    if (invalidEvents.length > 0) {
      throw new BadRequestException(
        `Invalid webhook events: ${invalidEvents.join(', ')}. Valid events: ${VALID_EVENTS.join(', ')}`,
      );
    }

    if (data.events.length === 0) {
      throw new BadRequestException('At least one event is required');
    }

    return this.prisma.webhook.create({
      data: {
        organizationId,
        url: data.url,
        events: data.events as WebhookEvent[],
        active: data.active ?? true,
        secret: this.generateSecret(),
      },
    });
  }

  async update(
    organizationId: string,
    id: string,
    data: { url?: string; events?: string[]; active?: boolean },
  ) {
    const webhook = await this.prisma.webhook.findFirst({
      where: { id, organizationId },
    });

    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }

    // Validate URL if provided
    if (data.url) {
      try {
        new URL(data.url);
      } catch {
        throw new BadRequestException('Invalid webhook URL');
      }
    }

    // Validate events if provided
    if (data.events) {
      const invalidEvents = data.events.filter(
        (e) => !VALID_EVENTS.includes(e as WebhookEvent),
      );
      if (invalidEvents.length > 0) {
        throw new BadRequestException(
          `Invalid webhook events: ${invalidEvents.join(', ')}`,
        );
      }
      if (data.events.length === 0) {
        throw new BadRequestException('At least one event is required');
      }
    }

    const updateData: any = {};
    if (data.url !== undefined) updateData.url = data.url;
    if (data.events !== undefined) updateData.events = data.events as WebhookEvent[];
    if (data.active !== undefined) updateData.active = data.active;

    return this.prisma.webhook.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(organizationId: string, id: string) {
    const webhook = await this.prisma.webhook.findFirst({
      where: { id, organizationId },
    });

    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }

    await this.prisma.webhook.delete({ where: { id } });
    return { success: true };
  }

  /**
   * Send webhook event to all active webhooks configured for this event type.
   * Called by other services when relevant events occur.
   */
  async sendWebhook(
    organizationId: string,
    event: WebhookEvent,
    payload: Record<string, any>,
  ) {
    const webhooks = await this.prisma.webhook.findMany({
      where: {
        organizationId,
        active: true,
        events: { has: event },
      },
    });

    if (webhooks.length === 0) {
      return { sent: 0, results: [] };
    }

    const timestamp = new Date().toISOString();
    const body = JSON.stringify({
      event,
      payload,
      timestamp,
      organizationId,
    });

    const results = await Promise.allSettled(
      webhooks.map(async (webhook) => {
        const signature = webhook.secret
          ? this.computeSignature(body, webhook.secret)
          : undefined;

        try {
          const response = await fetch(webhook.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Webhook-Event': event,
              'X-Webhook-Timestamp': timestamp,
              ...(signature && { 'X-Webhook-Signature': signature }),
              ...(webhook.secret && { 'X-Webhook-Secret': webhook.secret }),
            },
            body,
            signal: AbortSignal.timeout(10000), // 10 second timeout
          });

          this.logger.log(
            `Webhook ${webhook.id} sent to ${webhook.url}: ${response.status}`,
          );

          return {
            webhookId: webhook.id,
            status: response.status,
            success: response.ok,
          };
        } catch (error) {
          this.logger.error(
            `Webhook ${webhook.id} failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );

          return {
            webhookId: webhook.id,
            status: 0,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      }),
    );

    const fulfilled = results
      .filter(
        (r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled',
      )
      .map((r) => r.value);

    return {
      sent: webhooks.length,
      results: fulfilled,
    };
  }

  /**
   * Compute HMAC-SHA256 signature for webhook payload verification.
   */
  private computeSignature(payload: string, secret: string): string {
    return `sha256=${crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex')}`;
  }

  /**
   * Generate a secure random webhook secret.
   */
  private generateSecret(): string {
    return `whsec_${crypto.randomBytes(24).toString('hex')}`;
  }
}
