import { Injectable } from '@nestjs/common';
import { McpPrompt, McpTool } from '@gitroom/nestjs-libraries/mcp/mcp.tool';
import { IntegrationService } from '@gitroom/nestjs-libraries/database/prisma/integrations/integration.service';
import { string, array, enum as eenum, object, boolean, optional } from 'zod';
import { PostsService } from '@gitroom/nestjs-libraries/database/prisma/posts/posts.service';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import dayjs from 'dayjs';
import { OpenaiService } from '@gitroom/nestjs-libraries/openai/openai.service';
import { UploadFactory } from '@gitroom/nestjs-libraries/upload/upload.factory';
import { AllProvidersSettings } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/all.providers.settings';
import { IntegrationManager } from '@gitroom/nestjs-libraries/integrations/integration.manager';
import { SubscriptionService } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.service';
import { MediaService } from '@gitroom/nestjs-libraries/database/prisma/media/media.service';
import { OrganizationService } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.service';
import { Readable } from 'stream';

@Injectable()
export class MainMcp {
  constructor(
    private _integrationService: IntegrationService,
    private _integrationManager: IntegrationManager,
    private _postsService: PostsService,
    private _openAiService: OpenaiService,
    private _subscriptionService: SubscriptionService,
    private _mediaService: MediaService,
    private _organizationService: OrganizationService,
  ) { }

  @McpTool({ toolName: 'POSTIZ_GET_CONFIG_ID' })
  async preRun() {
    return [
      {
        type: 'text',
        text: `id: ${makeId(10)} Today date is ${dayjs.utc().format()}`,
      },
    ];
  }

  @McpTool({ toolName: 'POSTIZ_PROVIDERS_LIST' })
  async listOfProviders(organization: string) {
    const list = (
      await this._integrationService.getIntegrationsList(organization)
    ).map((org) => ({
      id: org.id,
      name: org.name,
      identifier: org.providerIdentifier,
      picture: org.picture,
      disabled: org.disabled,
      profile: org.profile,
      internalId: org.internalId,
      customer: org.customer
        ? {
          id: org.customer.id,
          name: org.customer.name,
        }
        : undefined,
    }));

    const formattedText = list.map((provider, index) => {
      const status = provider.disabled ? '❌ Deshabilitado' : '✅ Activo';
      return `*${index + 1}. ${this._integrationManager.getSocialIntegration(provider.identifier)?.name}: ${provider.name}* ${status}
🆔 ID: ${provider.id}
🔗 Identificador: ${provider.identifier}
🖼️ Imagen: ${provider.picture || 'No disponible'}
👤 Perfil: ${provider.profile || 'No disponible'}
🔑 internalId: ${provider.internalId || 'No disponible'}
${provider.customer ? `👥 Cliente:
  - ID: ${provider.customer.id}
  - Nombre: ${provider.customer.name}` : ''}`;
    }).join('\n\n');

    return [{ type: 'text', text: `*Lista de Proveedores:*\n\n${formattedText}` }];
  }

  @McpTool({
    toolName: 'POSTIZ_SCHEDULE_POST',
    zod: {
      type: eenum(['draft', 'schedule', 'now']),
      configId: string(),
      generatePictures: boolean(),
      date: string().describe('UTC TIME'),
      providerId: string().describe('Use POSTIZ_PROVIDERS_LIST to get the id'),
      posts: array(object({ text: string(), images: array(string()) })),
      settings: optional(object({}).passthrough()),
    },
  })
  async schedulePost(
    organization: string,
    obj: {
      type: 'draft' | 'schedule' | 'now';
      generatePictures: boolean;
      date: string;
      providerId: string;
      posts: { text: string; images?: string[] }[];
      settings?: AllProvidersSettings,
    }
  ) {
    const generateImage = async (text: string) => {
      const pathAI = await this._openAiService.generateImage(
        text,
        true
      )

      const uploader = UploadFactory.createStorage()
      const path = await uploader.uploadSimple(pathAI)

      return { id: makeId(10), path }
    }

    const create = await this._postsService.createPost(organization, {
      date: obj.date,
      type: obj.type,
      tags: [],
      posts: [
        {
          group: makeId(10),
          value: await Promise.all(
            obj.posts.map(async (post) => ({
              content: post.text,
              id: makeId(10),
              image: !obj.generatePictures
                ? (post.images || []).map((img) => ({
                  id: makeId(10),
                  path: img,
                }))
                : [
                  await generateImage(post.text)
                ],
            }))
          ),
          // @ts-ignore
          settings: obj.settings || {},
          integration: {
            id: obj.providerId,
          },
        },
      ],
    });

    return [
      {
        type: 'text',
        text: `Post created successfully, check it here: ${process.env.FRONTEND_URL}/p/${create[0].postId}`,
      },
    ];
  }

  @McpTool({ toolName: 'PUBLICA_LIST_DISCORD_CHANNELS', zod: { internalId: string().describe('Use POSTIZ_PROVIDERS_LIST to get the internalId') }, })
  async listDiscordChannels(orgId: string, obj: { internalId: string }) {
    const integrationProvider = this._integrationManager.getSocialIntegration('discord');

    if (!integrationProvider) {
      return [{ type: 'text', text: 'Invalid provider' }];
    }

    // @ts-ignore
    const load = await integrationProvider['channels'](
      '',
      '',
      obj.internalId,
    );

    // @ts-ignore
    const text = load.reduce((acc, item: { name: string, id: string }) => (acc + `id: ${item.id}\nname: ${item.name}\n\n`), '')

    return [{ type: 'text', text: `*Discord channels*:\n\n${text}` }];
  }

  @McpTool({ toolName: "PUBLICA_GENERATE_IMAGE_WITH_PROMPT", zod: { prompt: string().min(30).describe('Use the post caption to generate image') } })
  async generateImageWithPrompt(org: string, { prompt }: { prompt: string }) {
    const organization = await this._organizationService.getOrgByIdWithSubscription(org)

    const total = await this._subscriptionService.checkCredits(organization);
    if (total.credits <= 0) {
      return [{
        type: 'text',
        text: 'Lo siento, no tienes créditos disponibles para generar imágenes. Por favor, actualiza tu plan para continuar usando esta función.',
      }];
    }

    const rawGenerate = await this._mediaService.generateImage(prompt, organization, false);
    const file = this.base64ToMulterFile(rawGenerate, `${makeId(10)}.png`)

    const storage = UploadFactory.createStorage();
    const { path } = await storage.uploadFile(file, 'image/png');

    const caption = `¿Qué te parece esta imagen para tu post? Puedo generar otra si lo prefieres. (Créditos restantes: ${total.credits})`;

    await this._mediaService.saveFile(org, prompt, path)

    return [{
      type: 'text',
      text: `Media received: ${path} \nCaption: ${caption}`,
      image: path,
      caption,
    }];
  }

  private base64ToMulterFile(base64: string, filename: string): Express.Multer.File {
    const base64Data = base64.includes('base64,') ? base64.split('base64,')[1] : base64;

    const buffer = Buffer.from(base64Data, 'base64');
    const mimetype = 'image/png';

    return {
      fieldname: 'file',
      originalname: filename,
      encoding: '7bit',
      mimetype,
      size: buffer.length,
      buffer,
      stream: Readable.from(buffer),
      destination: '',
      filename,
      path: '',
    };
  }
}
