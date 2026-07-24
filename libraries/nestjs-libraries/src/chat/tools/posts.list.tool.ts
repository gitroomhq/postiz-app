import { AgentToolInterface } from '@gitroom/nestjs-libraries/chat/agent.tool.interface';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { Injectable } from '@nestjs/common';
import { PostsService } from '@gitroom/nestjs-libraries/database/prisma/posts/posts.service';
import { checkAuth } from '@gitroom/nestjs-libraries/chat/auth.context';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

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
Returns every post in the window whatever its state (scheduled, draft, published, errored).
"startDate" and "endDate" are required (UTC) - to list all upcoming posts, pass a wide window (for example from now to a year ahead).
Each item has an "id", its publish date, state, content, channel and current provider settings.
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
        }),
      }),
      execute: async (inputData, context) => {
        checkAuth(inputData, context);
        const organizationId = JSON.parse(
          (context?.requestContext as any)?.get('organization') as string
        ).id;

        const posts = await this._postsService.getPosts(organizationId, {
          startDate: inputData.startDate,
          endDate: inputData.endDate,
          customer: inputData.customer,
        } as any);

        return {
          output: {
            posts: (posts || []).map((p: any) => ({
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
          },
        };
      },
    });
  }
}
