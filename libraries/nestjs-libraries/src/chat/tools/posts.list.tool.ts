import { AgentToolInterface } from '@gitroom/nestjs-libraries/chat/agent.tool.interface';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { Injectable } from '@nestjs/common';
import { PostsService } from '@gitroom/nestjs-libraries/database/prisma/posts/posts.service';
import { checkAuth } from '@gitroom/nestjs-libraries/chat/auth.context';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

const PAGE_SIZE = 50;

const parseSettings = (settings: string | null) => {
  try {
    return JSON.parse(settings || '{}');
  } catch (err) {
    return {};
  }
};

@Injectable()
export class PostsListTool implements AgentToolInterface {
  constructor(private _postsService: PostsService) {}
  name = 'postsListTool';

  run() {
    return createTool({
      id: 'postsListTool',
      mcp: {
        annotations: {
          title: 'List Posts',
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
      },
      description: `
List the organization's posts scheduled to be published between two dates (the same data as the "List Posts" API endpoint).
Returns the posts in the window whatever their state (scheduled, draft, published, errored), ordered by publish date.
"startDate" and "endDate" are required (UTC) - prefer a narrow window (days or weeks) over a wide one.
Results are paged, ${PAGE_SIZE} posts per page: "total" is the number of posts in the window and "hasMore" tells if there are more pages - to get the next page, call again with the same dates and "page" + 1 (the first page is 0).
Each item has an "id", its publish date, state, content, channel and current provider settings.
Posts cannot be deleted through the Postiz tools - if the user wants to delete a post, tell them to do it themselves in the Postiz app; never offer to delete a post.
`,
      inputSchema: z.object({
        startDate: z
          .string()
          .describe('Start of the window (UTC), for example 2026-07-20T00:00:00'),
        endDate: z
          .string()
          .describe('End of the window (UTC), for example 2026-08-20T00:00:00'),
        customer: z
          .string()
          .optional()
          .describe('Optional customer (group) id to filter the channels by'),
        page: z
          .number()
          .int()
          .min(0)
          .optional()
          .describe('Page number, starts at 0 (default 0)'),
      }),
      outputSchema: z.object({
        output: z.object({
          posts: z.array(
            z.object({
              id: z
                .string()
                .describe('The post id'),
              publishDate: z.string().describe('UTC time'),
              state: z.string().describe('QUEUE, DRAFT, PUBLISHED or ERROR'),
              content: z.string(),
              settings: z
                .any()
                .describe('The post current provider settings'),
              group: z.string(),
              integrationId: z.string(),
              platform: z.string(),
              integrationName: z.string(),
            })
          ),
          total: z.number().describe('Number of posts in the window'),
          page: z.number(),
          hasMore: z.boolean().describe('True if there are more pages'),
        }),
      }),
      execute: async (inputData, context) => {
        checkAuth(inputData, context);
        const organizationId = JSON.parse(
          (context?.requestContext as any)?.get('organization') as string
        ).id;

        const page = inputData.page || 0;
        const all = (
          (await this._postsService.getPosts(organizationId, {
            startDate: inputData.startDate,
            endDate: inputData.endDate,
            customer: inputData.customer,
          } as any)) || []
        ).sort(
          (a: any, b: any) =>
            dayjs(a.publishDate).valueOf() - dayjs(b.publishDate).valueOf() ||
            a.id.localeCompare(b.id)
        );
        const posts = all.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

        return {
          output: {
            posts: posts.map((p: any) => ({
              id: p.id,
              publishDate: dayjs(p.publishDate)
                .utc()
                .format('YYYY-MM-DDTHH:mm:ss'),
              state: p.state,
              content: p.content || '',
              settings: parseSettings(p.settings),
              group: p.group,
              integrationId: p.integration?.id,
              platform: p.integration?.providerIdentifier,
              integrationName: p.integration?.name,
            })),
            total: all.length,
            page,
            hasMore: (page + 1) * PAGE_SIZE < all.length,
          },
        };
      },
    });
  }
}
