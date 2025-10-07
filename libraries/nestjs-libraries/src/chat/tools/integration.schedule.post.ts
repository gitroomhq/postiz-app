import { AgentToolInterface } from '@gitroom/nestjs-libraries/chat/agent.tool.interface';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { Injectable } from '@nestjs/common';
import { socialIntegrationList } from '@gitroom/nestjs-libraries/integrations/integration.manager';
import { IntegrationService } from '@gitroom/nestjs-libraries/database/prisma/integrations/integration.service';
import { PostsService } from '@gitroom/nestjs-libraries/database/prisma/posts/posts.service';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import { AllProvidersSettings } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/all.providers.settings';
import { validate } from 'class-validator';
import { Integration } from '@prisma/client';

@Injectable()
export class IntegrationSchedulePostTool implements AgentToolInterface {
  constructor(
    private _postsService: PostsService,
    private _integrationService: IntegrationService
  ) {}
  name = 'integrationSchedulePostTool';

  async run(): Promise<any> {
    return createTool({
      id: 'schedulePostTool',
      description: `
This tool allows you to schedule a post to a social media platform, based on integrationSchema tool.
So for example:

If the user want to post a post to LinkedIn with one comment
- socialPost array length will be one
- postsAndComments array length will be two (one for the post, one for the comment)

If the user want to post 20 posts for facebook each in individual days without comments
- socialPost array length will be 20
- postsAndComments array length will be one

If the tools return errors, you would need to rerun it with the right parameters, don't ask again, just run it
`,
      inputSchema: z.object({
        socialPost: z
          .array(
            z.object({
              integrationId: z
                .string()
                .describe('The id of the integration (not internal id)'),
              date: z.string().describe('The date of the post in UTC time'),
              shortLink: z
                .boolean()
                .describe(
                  'If the post has a link inside, we can ask the user if they want to add a short link'
                ),
              type: z
                .enum(['draft', 'schedule', 'now'])
                .describe(
                  'The type of the post, if we pass now, we should pass the current date also'
                ),
              postsAndComments: z
                .array(
                  z.object({
                    content: z.string().describe('The content of the post'),
                    attachments: z
                      .array(z.string())
                      .describe('The image of the post (URLS)'),
                  })
                )
                .describe(
                  'first item is the post, every other item is the comments'
                ),
              settings: z
                .array(
                  z.object({
                    key: z
                      .string()
                      .describe('Name of the settings key to pass'),
                    value: z
                      .any()
                      .describe(
                        'Value of the key, always prefer the id then label if possible'
                      ),
                  })
                )
                .describe(
                  'This relies on the integrationSchema tool to get the settings [input:settings]'
                ),
            })
          )
          .describe('Individual post'),
      }),
      outputSchema: z.object({
        output: z
          .array(
            z.object({
              id: z.string(),
              postId: z.string(),
              releaseURL: z.string(),
              status: z.string(),
            })
          )
          .or(z.object({ errors: z.string() })),
      }),
      execute: async ({ runtimeContext, context }) => {
        console.log(JSON.stringify(context, null, 2));
        // @ts-ignore
        const organizationId = runtimeContext.get('organization') as string;
        const finalOutput = [];

        const integrations = {} as Record<string, Integration>;
        for (const platform of context.socialPost) {
          integrations[platform.integrationId] =
            await this._integrationService.getIntegrationById(
              organizationId,
              platform.integrationId
            );

          const { dto } = socialIntegrationList.find(
            (p) =>
              p.identifier ===
              integrations[platform.integrationId].providerIdentifier
          )!;

          if (dto) {
            const newDTO = new dto();
            const obj = Object.assign(
              newDTO,
              platform.settings.reduce(
                (acc, s) => ({
                  ...acc,
                  [s.key]: s.value,
                }),
                {} as AllProvidersSettings
              )
            );
            const errors = await validate(obj);
            if (errors.length) {
              console.log(errors);
              return {
                errors: JSON.stringify(errors),
              };
            }
          }
        }

        for (const post of context.socialPost) {
          const integration = integrations[post.integrationId];

          if (!integration) {
            throw new Error('Integration not found');
          }

          const output = await this._postsService.createPost(organizationId, {
            date: post.date,
            type: post.type as 'draft' | 'schedule' | 'now',
            shortLink: post.shortLink,
            tags: [],
            posts: [
              {
                integration,
                group: makeId(10),
                settings: post.settings.reduce(
                  (acc, s) => ({
                    ...acc,
                    [s.key]: s.value,
                  }),
                  {} as AllProvidersSettings
                ),
                value: post.postsAndComments.map((p) => ({
                  content: p.content,
                  id: makeId(10),
                  image: p.attachments.map((p) => ({
                    id: makeId(10),
                    path: p,
                  })),
                })),
              },
            ],
          });
          finalOutput.push(...output);
        }

        return {
          output: finalOutput,
        };
      },
    });
  }
}
