import { AgentToolInterface } from '@gitroom/nestjs-libraries/chat/agent.tool.interface';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { Injectable } from '@nestjs/common';
import { PostsService } from '@gitroom/nestjs-libraries/database/prisma/posts/posts.service';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import { AllProvidersSettings } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/all.providers.settings';
import { checkAuth } from '@gitroom/nestjs-libraries/chat/auth.context';
import { buildSettings } from '@gitroom/nestjs-libraries/chat/tools/integration.schedule.post';
import {
  ValidUrlExtension,
  ValidUrlPath,
} from '@gitroom/helpers/utils/valid.url.path';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

const validUrlExtension = new ValidUrlExtension();
const validUrlPath = new ValidUrlPath();

// Same URL validation as MediaDto (valid.url.path) - each attachment must
// point to an allowed upload domain and a supported file extension.
const attachmentUrl = z
  .string()
  .refine((url) => validUrlPath.validate(url, {} as any), {
    message: validUrlPath.defaultMessage({} as any),
  })
  .refine((url) => validUrlExtension.validate(url, {} as any), {
    message: validUrlExtension.defaultMessage({} as any),
  });

@Injectable()
export class UpdatePostTool implements AgentToolInterface {
  constructor(private _postsService: PostsService) {}
  name = 'updatePostTool';

  run() {
    return createTool({
      id: 'updatePostTool',
      mcp: {
        annotations: {
          title: 'Update Scheduled Post',
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: false,
          openWorldHint: true,
        },
      },
      description: `
Update an existing scheduled post (or draft) that was NOT published yet - its publish time hasn't arrived.
Find the post with postsListTool first and pass its "id" here.
You can change the settings (merged into the existing ones - only pass the keys you want to change),
the publish date, and/or the content. Anything you don't pass stays as it is.
To update multiple posts, call this tool once per post.
If the tool returns errors, rerun it with the right parameters, don't ask again, just run it.
`,
      inputSchema: z.object({
        id: z
          .string()
          .describe('The "id" of the post, taken from postsListTool'),
        date: z
          .string()
          .optional()
          .describe(
            'New date for the post in UTC time, only if the user wants to change it'
          ),
        settings: z
          .array(
            z.object({
              key: z.string().describe('Name of the settings key to change'),
              value: z
                .any()
                .describe(
                  'New value of the key, always prefer the id then label if possible'
                ),
            })
          )
          .optional()
          .describe(
            'Settings keys to change, merged into the existing settings. This relies on the integrationSchema tool [input:settings]'
          ),
        postsAndComments: z
          .array(
            z.object({
              content: z
                .string()
                .describe(
                  "The content of the post, HTML, Each line must be wrapped in <p> here is the possible tags: h1, h2, h3, u, strong, li, ul, p (you can't have u and strong together)"
                ),
              attachments: z
                .array(attachmentUrl)
                .describe('The image of the post (URLS)'),
            })
          )
          .optional()
          .describe(
            'Only to replace the content: first item is the post, every other item is the comments. Omit to keep the existing content'
          ),
      }),
      outputSchema: z.object({
        output: z
          .object({
            postId: z.string(),
            publishDate: z.string(),
          })
          .or(z.object({ errors: z.string() })),
      }),
      execute: async (inputData, context) => {
        checkAuth(inputData, context);
        const organizationId = JSON.parse(
          (context?.requestContext as any)?.get('organization') as string
        ).id;

        // Ordered as post -> comments, root includes integration and tags.
        const ordered = await this._postsService.getPostsRecursively(
          inputData.id,
          true,
          organizationId,
          true
        );

        const [root] = ordered;
        if (!root) {
          return { output: { errors: 'Post not found' } };
        }

        if (root.parentPostId) {
          return {
            output: {
              errors:
                'This id belongs to a comment, pass the id of the main post',
            },
          };
        }

        if (root.state !== 'QUEUE' && root.state !== 'DRAFT') {
          return {
            output: {
              errors:
                'Only scheduled posts that were not published yet (or drafts) can be updated',
            },
          };
        }

        if (
          root.state === 'QUEUE' &&
          dayjs.utc(root.publishDate).isBefore(dayjs.utc())
        ) {
          return {
            output: {
              errors:
                'The publish time of this post already passed, it cannot be updated',
            },
          };
        }

        if (inputData.date && dayjs.utc(inputData.date).isBefore(dayjs.utc())) {
          return {
            output: { errors: 'The new date must be in the future (UTC)' },
          };
        }

        const integration = (root as any).integration;

        let existingSettings: AllProvidersSettings;
        try {
          existingSettings = JSON.parse(root.settings || '{}');
        } catch (err) {
          existingSettings = {} as AllProvidersSettings;
        }

        const settings = buildSettings(
          integration.providerIdentifier,
          inputData.settings || [],
          {
            ...existingSettings,
            __type: integration.providerIdentifier,
          } as AllProvidersSettings
        );

        // Keep the existing post ids (by position) so the posts are updated in
        // place and the running publish workflow is restarted, not duplicated.
        const value = inputData.postsAndComments?.length
          ? inputData.postsAndComments.map(
              (p: { content: string; attachments: string[] }, index: number) => ({
              id: ordered[index]?.id,
              content: p.content,
              delay: ordered[index]?.delay || 0,
              image: (p.attachments || []).map((path: string) => ({
                id: makeId(10),
                path,
              })),
              })
            )
          : ordered.map((p) => {
              let image = [];
              try {
                image = JSON.parse(p.image || '[]');
              } catch (err) {}
              return {
                id: p.id,
                content: p.content,
                delay: p.delay || 0,
                image,
              };
            });

        // Same server-side validation as the dashboard / schedule tool.
        const [validation] = await this._postsService.validatePosts(
          organizationId,
          [
            {
              integration: { id: integration.id },
              settings,
              value: value.map((p: { content: string; image: any[] }) => ({
                content: p.content,
                image: p.image,
              })),
            },
          ]
        );

        if (validation.emptyContent) {
          return {
            output: {
              errors: `${validation.name}: Your post should have at least one character or one image.`,
            },
          };
        }

        if (root.state !== 'DRAFT') {
          if (!validation.valid) {
            return {
              output: {
                errors: `${validation.name}: ${
                  validation.settingsError || 'Please fix your settings'
                }, please fix it, and try updatePostTool again.`,
              },
            };
          }

          if (validation.errors !== true) {
            return {
              output: {
                errors: `${validation.name}: ${validation.errors}, please fix it, and try updatePostTool again.`,
              },
            };
          }

          if (validation.tooLong) {
            return {
              output: {
                errors: `${validation.name}: The maximum characters is ${validation.maximumCharacters}, please fix it, and try updatePostTool again.`,
              },
            };
          }
        }

        const date =
          inputData.date ||
          dayjs.utc(root.publishDate).format('YYYY-MM-DDTHH:mm:ss');

        // The publish workflow reads settings and content from the DB at
        // publish time, but the publish date only once at start - so restart
        // it (type "schedule") only when the date actually changed. "update"
        // keeps the current state and leaves the running workflow alone.
        const dateChanged =
          !!inputData.date &&
          !dayjs.utc(inputData.date).isSame(dayjs.utc(root.publishDate));

        const [output] = await this._postsService.createPost(
          organizationId,
          {
            date,
            type: dateChanged && root.state === 'QUEUE' ? 'schedule' : 'update',
            shortLink: false,
            tags: ((root as any).tags || []).map((t: any) => ({
              value: t.tag.name,
              label: t.tag.name,
            })),
            posts: [
              {
                integration,
                group: root.group,
                settings,
                value,
              },
            ],
          } as any,
          'MCP',
          // Keep the group stable: the user may have the calendar open while
          // the agent updates the post, and the calendar links posts by group.
          true
        );

        if (!output) {
          return { output: { errors: 'Failed to update the post' } };
        }

        return {
          output: {
            postId: output.postId,
            publishDate: date,
          },
        };
      },
    });
  }
}
