import { Body, Controller, Get, HttpException, Post, Query, Req, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { OrganizationService } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.service';
import { ioRedis } from '@gitroom/nestjs-libraries/redis/redis.service';
import { McpLocalService } from '@gitroom/nestjs-libraries/mcp/local/mcp.local.service';
import { localpSystemPrompt } from '@gitroom/nestjs-libraries/mcp/local/local.prompts';
import { WhatsappService } from '@gitroom/nestjs-libraries/whatsapp/whatsapp.service';
import { UploadFactory } from '@gitroom/nestjs-libraries/upload/upload.factory';

@ApiTags('Publica')
@Controller('/publica')
export class PublicaController {
  constructor(
    private readonly _mcpLocalService: McpLocalService,
    private readonly _organizationService: OrganizationService,
    private readonly _whatsappService: WhatsappService,
  ) { }

  @Get('/whatsapp')
  async verifyWebhook(@Query('hub.mode') mode: string, @Query('hub.challenge') challenge: string, @Query('hub.verify_token') verifyToken: string, @Res() res: Response) {
    const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN || 'publica_verify_token';

    if (mode === 'subscribe' && verifyToken === expectedToken) {
      console.log('✅ Webhook verified!');
      return res.status(200).send(challenge);
    } else {
      console.warn('❌ Webhook verification failed');
      return res.sendStatus(403);
    }
  }

  @Post('/whatsapp')
  async receiveWebhook(@Body() body: any) {
    console.log('Incoming webhook:', JSON.stringify(body, null, 2));

    const entry = body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const message = changes?.value?.messages?.[0];

    if (!message) {
      return { success: true };
    }

    const api = '6e99449a057dbe270f3bd650fb78731123b458287d8b34ab6a7381ff8d246783';
    const apiModel = await this._organizationService.getOrgByApiKey(api);

    if (!apiModel) {
      throw new HttpException('Invalid API Key', 400);
    }

    if (message.type === 'image' || message.type === 'video') {
      const media = await this._whatsappService.downloadMedia(message[message.type].id);

      const upload = UploadFactory.createStorage()

      const file = await upload.uploadFile(media)
      const caption = message[message.type]?.caption

      message.text = {
        body: caption ? `Media received: ${file.path} \nCaption: ${caption}` : `Media received: ${file.path}`,
      }
    }

    const from = message.from;
    const text = message?.text?.body;
    const messageId = message.id;
    const organizationId = apiModel.id;
    const messageContextId = message.context?.id;

    if (!from || !text) {
      throw new HttpException('Invalid WhatsApp message format', 400);
    }

    if (messageContextId) {
      const originalMessageRaw = await ioRedis.get(`mcp:sent:${organizationId}:${from}:${messageContextId}`);
      const originalMessage = originalMessageRaw ? JSON.parse(originalMessageRaw) : null;

      if (originalMessage?.text) {
        message.text = {
          body: `Respondiendo a: "${originalMessage.text}"\n\n${text}`,
        }
      }
    }

    const redisContextKey = `mcp:context:${organizationId}:${from}`;
    const redisMessageKey = `mcp:sent:${organizationId}:${from}:${messageId}`

    await ioRedis.set(redisMessageKey, JSON.stringify({ text }), 'EX', 60 * 60);

    let previousContext = await ioRedis.get(redisContextKey);
    let messages = previousContext ? JSON.parse(previousContext) : [];

    messages.push({
      role: 'user',
      content: {
        type: 'text',
        text,
      },
    });

    const response = await this._mcpLocalService.createMessage(organizationId, {
      messages,
      systemPrompt: localpSystemPrompt,
      temperature: 0.7,
      maxTokens: 500,
    });

    if (response?.content?.text) {
      messages.push({
        role: 'assistant',
        content: {
          type: 'text',
          text: response.content.text,
        },
      });

      const { id } = await this._whatsappService.sendText(from, response.content.text as string);

      const redisMessageKey = `mcp:sent:${organizationId}:${from}:${id}`
      await ioRedis.set(redisMessageKey, JSON.stringify({ text }), 'EX', 60 * 60);
    }

    await ioRedis.set(redisContextKey, JSON.stringify(messages), 'EX', 60 * 60);

    return { success: true };
  }
}
