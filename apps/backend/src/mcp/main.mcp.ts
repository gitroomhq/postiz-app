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

@Injectable()
export class MainMcp {
  constructor(
    private _integrationService: IntegrationService,
    private _integrationManager: IntegrationManager,
    private _postsService: PostsService,
    private _openAiService: OpenaiService
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
    console.log(JSON.stringify(obj, null, 2))
    
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
  async listDiscordChannels(orgId: string, obj: { internalId: string} ) {
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

    const text = load.reduce((acc, item: { name: string, id: string }) => (acc + `id: ${item.id}\nname: ${item.name}\n\n`), '')

    return [{ type: 'text', text: `*Discord channels*:\n\n${text}` }];
  }
}
