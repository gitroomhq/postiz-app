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
          title: 'List Upcoming Posts',
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
      },
      description: `
List the organization's upcoming (not-yet-published) posts - both drafts and scheduled posts whose publish time is still in the future. By default returns all of them, so "list all my unpublished posts" is a single call with no arguments.
Only future posts are returned; past posts (including old forgotten drafts) are never listed.
Optionally narrow with "state" to only drafts or only scheduled posts.
Each item has a "state" (draft or scheduled) and its current provider settings, so you can tell which posts need a change.
Use this to find the posts the user wants to inspect or update - pass the returned "id" to updatePostTool.
Results are paginated (20 per page), use "page" and "hasMore" to fetch all of them.
`,
      inputSchema: z.object({
        platform: z
          .string()
          .optional()
          .describe(
            'Filter by platform identifier, for example: tiktok, linkedin, x'
          ),
        integrationId: z
          .string()
          .optional()
          .describe('Filter by a specific integration (channel) id'),
        state: z
          .enum(['scheduled', 'draft'])
          .optional()
          .describe(
            'Omit to get all upcoming posts (future drafts + future scheduled). "scheduled" = only future scheduled posts. "draft" = only future drafts. Past posts are never returned.'
          ),
        page: z.number().optional().describe('Page number, starting at 0'),
      }),
      outputSchema: z.object({
        output: z.object({
          posts: z.array(
            z.object({
              id: z
                .string()
                .describe('Pass this to updatePostTool to update the post'),
              publishDate: z.string().describe('UTC time'),
              state: z.enum(['draft', 'scheduled']),
              platform: z.string(),
              integrationId: z.string(),
              integrationName: z.string(),
              content: z.string(),
              settings: z.any(),
            })
          ),
          total: z.number(),
          page: z.number(),
          hasMore: z.boolean(),
        }),
      }),
      execute: async (inputData, context) => {
        checkAuth(inputData, context);
        const organizationId = JSON.parse(
          (context?.requestContext as any)?.get('organization') as string
        ).id;

        const list = await this._postsService.getAgentPostsList(
          organizationId,
          {
            integrationId: inputData.integrationId,
            platform: inputData.platform,
            state: inputData.state,
            page: inputData.page,
          }
        );

        return {
          output: {
            posts: list.posts.map((p) => ({
              id: p.id,
              publishDate: dayjs(p.publishDate)
                .utc()
                .format('YYYY-MM-DDTHH:mm:ss'),
              state: p.state === 'DRAFT' ? 'draft' : 'scheduled',
              platform: p.integration.providerIdentifier,
              integrationId: p.integration.id,
              integrationName: p.integration.name,
              content: p.content || '',
              settings: parseSettings(p.settings),
            })),
            total: list.total,
            page: list.page,
            hasMore: list.hasMore,
          },
        };
      },
    });
  }
}
