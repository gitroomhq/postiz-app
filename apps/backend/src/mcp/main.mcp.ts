import { Injectable } from '@nestjs/common';
import { McpTool } from '@gitroom/nestjs-libraries/mcp/mcp.tool';
import { IntegrationService } from '@gitroom/nestjs-libraries/database/prisma/integrations/integration.service';
import { string, array, enum as eenum, object, boolean } from 'zod';
import { PostsService } from '@gitroom/nestjs-libraries/database/prisma/posts/posts.service';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import dayjs from 'dayjs';
import { OpenaiService } from '@gitroom/nestjs-libraries/openai/openai.service';

@Injectable()
export class MainMcp {
  constructor(
    private _integrationService: IntegrationService,
    private _postsService: PostsService,
    private _openAiService: OpenaiService
  ) {}

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
      customer: org.customer
        ? {
            id: org.customer.id,
            name: org.customer.name,
          }
        : undefined,
    }));

    return [{ type: 'text', text: JSON.stringify(list) }];
  }

  @McpTool({
    toolName: 'POSTIZ_SCHEDULE_POST',
    zod: {
      type: eenum(['draft', 'scheduled']),
      configId: string(),
      generatePictures: boolean(),
      date: string().describe('UTC TIME'),
      providerId: string().describe('Use POSTIZ_PROVIDERS_LIST to get the id'),
      posts: array(object({ text: string(), images: array(string()) })),
    },
  })
  async schedulePost(
    organization: string,
    obj: {
      type: 'draft' | 'schedule';
      generatePictures: boolean;
      date: string;
      providerId: string;
      posts: { text: string }[];
    }
  ) {
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
                ? []
                : [
                    {
                      id: makeId(10),
                      path: await this._openAiService.generateImage(
                        post.text,
                        true
                      ),
                    },
                  ],
            }))
          ),
          // @ts-ignore
          settings: {},
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
}
