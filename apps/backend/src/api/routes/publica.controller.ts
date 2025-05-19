import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { ioRedis } from '@gitroom/nestjs-libraries/redis/redis.service';
import { McpLocalService } from '@gitroom/nestjs-libraries/mcp/local/mcp.local.service';
import { localpSystemPrompt } from '@gitroom/nestjs-libraries/mcp/local/local.prompts';
import { WhatsappService } from '@gitroom/nestjs-libraries/whatsapp/whatsapp.service';
import { UploadFactory } from '@gitroom/nestjs-libraries/upload/upload.factory';
import { UsersService } from '@gitroom/nestjs-libraries/database/prisma/users/users.service';
import { parsePhoneNumberWithError } from 'libphonenumber-js';
import { MediaService } from '@gitroom/nestjs-libraries/database/prisma/media/media.service';

@ApiTags('Publica')
@Controller('/publica')
export class PublicaController {
  constructor(
    private readonly _mcpLocalService: McpLocalService,
    private readonly _usersService: UsersService,
    private readonly _whatsappService: WhatsappService,
    private readonly _mediaService: MediaService,
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

    // ------- avoid duplicated menssages ------ //
    const rawMessageId = message.id;
    const key = `dedup:whatsapp:${rawMessageId}`;
    if (await ioRedis.get(key)) {
      return {
        success: true,
      }
    }
    await ioRedis.set(key, rawMessageId, 'EX', 86400); // 24h TTL
    // ---------------------------------------------- // 

    const user = await this._usersService.getUserAndOrganizationByPhone(message?.from)
    const org = user?.organizations[0]?.organization

    if (!user) {
      await this._whatsappService.sendText(
        message?.from,
        `Hola! No encontramos una cuenta asociada a tu número de teléfono. Puedes registrarte aquí: ${process.env.FRONTEND_URL}/auth. Si necesitas ayuda, contáctanos por:\n\n📧 Email: servicios@publica.do\n💬 Discord: https://discord.com/invite/ACt8ZbdnaE\n📅 Calendly: https://calendly.com/servicios-publica/30min\n\n¡Estamos aquí para ayudarte! 😊`
      );

      return {
        success: true,
      }
    }

    if (!user.phoneNumberVerified) {
      console.error('User phone number unverified: ', message?.from)

      await this._whatsappService.sendText(
        message?.from,
        `Hola! Tu número de teléfono aún no ha sido verificado. Por favor, verifica tu número para acceder a tu cuenta. Si necesitas ayuda, visita ${process.env.FRONTEND_URL}/settings o contáctanos por:\n\n📧 Email: servicios@publica.do\n💬 Discord: https://discord.com/invite/ACt8ZbdnaE\n📅 Calendly: https://calendly.com/servicios-publica/30min\n\n¡Estamos aquí para ayudarte! 😊`
      );

      return {
        success: true,
      }
    }

    if (message.type === 'image' || message.type === 'video') {
      const mediaObject = message[message.type];

      const caption = mediaObject?.caption

      if(caption?.includes('¿Qué te parece esta imagen para tu post? Puedo generar otra si lo prefieres. (Créditos restantes:')) {
        return true
      } 

      // ----------------- avoid duplicated media --------------------- //
      if (await ioRedis.get(`media:${mediaObject.sha256}`)) {
        return {
          success: true,
        }
      }
      await ioRedis.set(`media:${mediaObject.sha256}`, mediaObject.sha256, 'EX', 86400); // 24h TTL
      // ------------------------------------------------------------- // 

      const media = await this._whatsappService.downloadMedia(mediaObject.id);
      const upload = UploadFactory.createStorage()

      const file = await upload.uploadFile(media)

      await this._mediaService.saveFile(org.id, caption, file);

      message.text = {
        body: caption ? `Media received: ${file.path} \nCaption: ${caption}` : `Media received: ${file.path}`,
      }
    }

    const from = message?.from;
    const text = message?.text?.body;
    const messageId = message.id;
    const organizationId = user.organizations[0]?.organization?.id

    const messageContextId = message.context?.id;

    if (!from || !text) {
      console.error('Invalid WhatsApp message format');

      return {
        success: true
      }
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
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: `My country code is ${this.getCountryCodeByPhone(from)}.`,
        }
      },
      ...messages
      ],
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


      const { id } = await (response?.content?.image
        ? this._whatsappService.sendImage(from,
          response?.content?.image as string,
          response?.content?.caption as string,
        )
        : this._whatsappService.sendText(from, response.content.text as string
        ));

      const redisMessageKey = `mcp:sent:${organizationId}:${from}:${id}`
      await ioRedis.set(redisMessageKey, JSON.stringify({ text }), 'EX', 60 * 60);
    }

    await ioRedis.set(redisContextKey, JSON.stringify(messages), 'EX', 60 * 60);

    return { success: true };
  }

  getCountryCodeByPhone(phone: string): string {
    try {
      const normalized = phone.startsWith('+') ? phone : `+${phone}`;
      const parsed = parsePhoneNumberWithError(normalized);

      if (parsed.isValid()) {
        return parsed.country || 'DO';
      }

      console.warn('Invalid phone number:', phone);
      return 'DO';
    } catch (error) {
      console.error('Error getting country code by phone:', error);
      return 'DO'; // Fallback por defecto
    }
  }
}
