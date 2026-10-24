import {
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  RawBodyRequest,
  Req,
  Res,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AutoRepliesService } from '@gitroom/nestjs-libraries/database/prisma/auto-replies/auto-replies.service';

// Called by the platforms (no auth), the signature check happens in the provider
@ApiTags('Auto Replies Webhook')
@Controller('/auto-replies-webhook')
export class AutoRepliesWebhookController {
  constructor(private _autoRepliesService: AutoRepliesService) {}

  @Get('/:provider')
  verify(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response
  ) {
    const expected = process.env.AUTO_REPLIES_WEBHOOK_VERIFY_TOKEN;
    if (mode === 'subscribe' && !!expected && token === expected) {
      return res.status(200).type('text/plain').send(String(challenge));
    }
    return res.status(403).send('Verification failed');
  }

  @Post('/:provider')
  @HttpCode(200)
  async receive(
    @Param('provider') provider: string,
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response
  ) {
    const result = await this._autoRepliesService.handleWebhook(
      provider,
      req.rawBody?.toString('utf8') || '',
      req.headers
    );

    if (result === 'not-found') {
      return res.status(404).send();
    }
    if (result === 'invalid-signature') {
      return res.status(401).send();
    }
    return res.status(200).send({ success: true });
  }
}
