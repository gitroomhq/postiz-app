import { Injectable, Logger } from '@nestjs/common';
import {
  WebhookProvider,
  WebhookResponse,
} from '@gitroom/nestjs-libraries/integrations/webhook.provider';

/**
 * Example inbound webhook provider for Facebook.
 *
 * Handles:
 *  - Verification challenges (GET-style hub.challenge inside POST body)
 *  - Page/post engagement events (likes, comments, shares)
 *
 * Replace the logging with real business logic (e.g. update analytics,
 * trigger auto-replies, fire BullMQ jobs) once the pipeline is proven.
 */
@Injectable()
export class FacebookWebhookProvider implements WebhookProvider {
  readonly providerName = 'facebook';
  private readonly logger = new Logger(FacebookWebhookProvider.name);

  /**
   * Facebook sends a verification request when you first subscribe.
   * The challenge token is echoed back to confirm ownership.
   */
  async handleWebhook(
    payload: any,
    headers?: Record<string, string>
  ): Promise<WebhookResponse> {
    // Facebook verification challenge (subscribe flow)
    if (payload?.['hub.mode'] === 'subscribe' && payload?.['hub.challenge']) {
      this.logger.log('Facebook verification challenge received');
      return {
        statusCode: 200,
        body: payload['hub.challenge'],
        contentType: 'text/plain',
      };
    }

    // Normal webhook event
    const objectType = payload?.object; // "page", "user", etc.
    const entries = payload?.entry ?? [];

    this.logger.log(
      `Facebook webhook received — object: ${objectType}, entries: ${entries.length}`
    );

    for (const entry of entries) {
      const changes = entry?.changes ?? [];
      for (const change of changes) {
        this.logger.debug(
          `  field=${change.field} value=${JSON.stringify(change.value).slice(0, 200)}`
        );
        // TODO: Dispatch to analytics service, auto-reply engine, etc.
      }
    }

    return { statusCode: 200, body: { status: 'ok' } };
  }

  /**
   * Verify the X-Hub-Signature-256 header that Facebook attaches to every
   * webhook request.
   *
   * Uses the raw, unparsed request body (Buffer) for HMAC computation —
   * this is critical because JSON.stringify(parsedBody) does NOT produce
   * a byte-for-byte match of the original payload.
   */
  async verifyWebhook(
    rawBody: Buffer,
    headers?: Record<string, string>
  ): Promise<boolean> {
    const signature = headers?.['x-hub-signature-256'];
    if (!signature) {
      this.logger.warn('Missing x-hub-signature-256 header');
      // Allow unsigned requests in development; flip to `false` in production
      return true;
    }

    // TODO: Implement HMAC-SHA256 verification using the raw body:
    // import { createHmac, timingSafeEqual } from 'crypto';
    // const expected = 'sha256=' + createHmac('sha256', process.env.FACEBOOK_APP_SECRET!)
    //   .update(rawBody)
    //   .digest('hex');
    // return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));

    return true;
  }
}
