import { Injectable, Logger } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import {
  WebhookProvider,
  WebhookResponse,
} from '@gitroom/nestjs-libraries/integrations/webhook.provider';

/**
 * Inbound webhook provider for Facebook.
 *
 * Handles:
 *  - GET verification challenges (hub.mode / hub.challenge / hub.verify_token)
 *  - POST event delivery (page/post engagement: likes, comments, shares)
 *  - HMAC-SHA256 signature verification on POST events
 */
@Injectable()
export class FacebookWebhookProvider implements WebhookProvider {
  readonly providerName = 'facebook';
  private readonly logger = new Logger(FacebookWebhookProvider.name);

  // -- GET verification challenge ------------------------------------------

  /**
   * Facebook verifies webhook ownership by sending a GET request with:
   *   ?hub.mode=subscribe&hub.challenge=<token>&hub.verify_token=<token>
   *
   * We validate hub.verify_token against our configured secret and echo
   * back hub.challenge as plain text.
   */
  async handleVerification(
    query: Record<string, string>
  ): Promise<WebhookResponse> {
    const mode = query['hub.mode'];
    const challenge = query['hub.challenge'];
    const verifyToken = query['hub.verify_token'];

    if (mode !== 'subscribe' || !challenge) {
      this.logger.warn(
        `Invalid Facebook verification request: mode=${mode}, challenge=${challenge}`
      );
      return { statusCode: 400, body: 'Invalid verification request' };
    }

    const expectedToken = process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN;
    if (expectedToken && verifyToken !== expectedToken) {
      this.logger.warn('Facebook verify_token mismatch');
      return { statusCode: 403, body: 'Verification token mismatch' };
    }

    this.logger.log('Facebook verification challenge accepted');
    return {
      statusCode: 200,
      body: challenge,
      contentType: 'text/plain',
    };
  }

  // -- POST event handling -------------------------------------------------

  /**
   * Process incoming Facebook webhook events (likes, comments, shares, etc.).
   */
  async handleWebhook(
    payload: any,
    headers?: Record<string, string>
  ): Promise<WebhookResponse> {
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

  // -- POST signature verification -----------------------------------------

  /**
   * Verify the X-Hub-Signature-256 header using HMAC-SHA256.
   *
   * Facebook signs every POST payload with the app secret. We compute the
   * expected signature from the raw request body and compare using
   * timing-safe equality to prevent timing attacks.
   */
  async verifyWebhook(
    rawBody: Buffer,
    headers?: Record<string, string>
  ): Promise<boolean> {
    const signature = headers?.['x-hub-signature-256'];
    const appSecret = process.env.FACEBOOK_APP_SECRET;

    // If no app secret is configured, skip verification (dev mode only)
    if (!appSecret) {
      this.logger.warn(
        'FACEBOOK_APP_SECRET not configured — skipping signature verification. ' +
          'Set this in production to secure your webhook endpoint.'
      );
      return true;
    }

    if (!signature) {
      this.logger.warn('Missing x-hub-signature-256 header — rejecting request');
      return false;
    }

    const expected =
      'sha256=' +
      createHmac('sha256', appSecret)
        .update(new Uint8Array(rawBody))
        .digest('hex');

    try {
      return timingSafeEqual(
        new Uint8Array(Buffer.from(signature)),
        new Uint8Array(Buffer.from(expected))
      );
    } catch {
      // timingSafeEqual throws if buffers have different lengths
      return false;
    }
  }
}
