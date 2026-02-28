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
   * webhook request.  For now this is a placeholder — plug in the real
   * HMAC-SHA256 check using your app secret.
   */
  async verifyWebhook(
    payload: any,
    headers?: Record<string, string>
  ): Promise<boolean> {
    const signature = headers?.['x-hub-signature-256'];
    if (!signature) {
      this.logger.warn('Missing x-hub-signature-256 header');
      // Allow unsigned requests in development; flip to `false` in production
      return true;
    }

    // TODO: Implement HMAC-SHA256 verification:
    // const expected = 'sha256=' + crypto
    //   .createHmac('sha256', FACEBOOK_APP_SECRET)
    //   .update(JSON.stringify(payload))
    //   .digest('hex');
    // return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));

    return true;
  }
}
