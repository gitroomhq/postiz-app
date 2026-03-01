import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpException,
  HttpStatus,
  Logger,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import { IntegrationManager } from '@gitroom/nestjs-libraries/integrations/integration.manager';

/**
 * Unified controller for inbound webhooks from external platforms.
 *
 * Routes:
 *   POST /inbound-webhooks/:provider  — dispatch to the matching WebhookProvider
 *   GET  /inbound-webhooks            — list registered providers (health-check / debug)
 *
 * This controller requires NO authentication — external platforms call it directly.
 */
@ApiTags('Inbound Webhooks')
@Controller('/inbound-webhooks')
export class InboundWebhooksController {
  private readonly logger = new Logger(InboundWebhooksController.name);

  constructor(private readonly integrationManager: IntegrationManager) {}

  /**
   * List all registered inbound webhook providers.
   * Useful for health-checks and debugging.
   */
  @Get('/')
  listProviders() {
    return {
      providers: this.integrationManager.getRegisteredWebhookProviders(),
    };
  }

  /**
   * Receive an inbound webhook from an external platform and dispatch it
   * to the correct WebhookProvider based on the :provider path param.
   *
   * Examples:
   *   POST /inbound-webhooks/facebook
   *   POST /inbound-webhooks/x
   *   POST /inbound-webhooks/linkedin
   */
  @Post(':provider')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Param('provider') provider: string,
    @Body() body: any,
    @Headers() headers: Record<string, string>,
    @Req() req: RawBodyRequest<Request>
  ) {
    let handler;
    try {
      handler = this.integrationManager.getWebhookProvider(provider);
    } catch {
      this.logger.warn(`Webhook received for unknown provider: ${provider}`);
      throw new HttpException(
        `Unknown webhook provider: ${provider}`,
        HttpStatus.NOT_FOUND
      );
    }

    // Signature verification requires the raw, unparsed body — not the
    // parsed JSON object — to produce a byte-for-byte HMAC match.
    if (handler.verifyWebhook) {
      const rawBody = req.rawBody;
      if (!rawBody) {
        this.logger.error(
          `Raw body not available for provider ${provider}. ` +
            'Ensure NestJS is bootstrapped with { rawBody: true }.'
        );
        throw new HttpException(
          'Raw body not available for verification',
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
      const isValid = await handler.verifyWebhook(rawBody, headers);
      if (!isValid) {
        this.logger.warn(
          `Webhook verification failed for provider: ${provider}`
        );
        throw new HttpException(
          'Webhook verification failed',
          HttpStatus.UNAUTHORIZED
        );
      }
    }

    try {
      const result = await handler.handleWebhook(body, headers);
      return result?.body ?? { status: 'ok' };
    } catch (err: any) {
      this.logger.error(
        `Error processing webhook for ${provider}: ${err.message}`,
        err.stack
      );
      throw new HttpException(
        'Internal webhook processing error',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
