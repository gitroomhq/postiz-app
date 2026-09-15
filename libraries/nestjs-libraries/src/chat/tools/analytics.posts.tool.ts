import { AgentToolInterface } from '@gitroom/nestjs-libraries/chat/agent.tool.interface';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { Injectable } from '@nestjs/common';
import { checkAuth } from '@gitroom/nestjs-libraries/chat/auth.context';
import {
  ANALYTICS_AGENT_NOTES,
  PostMetricsService,
  toAgentPost,
} from '@gitroom/nestjs-libraries/database/prisma/analytics/post-metrics.service';

const agentPostSchema = z.object({
  id: z.string(),
  content: z.string(),
  publishDate: z.string(),
  releaseURL: z.string().nullable(),
  integrationId: z.string(),
  platform: z.string(),
  channelName: z.string(),
  impressions: z.number().nullable(),
  reactions: z.number().nullable(),
  comments: z.number().nullable(),
  shares: z.number().nullable(),
  engagementRate: z.number().nullable(),
});

@Injectable()
export class AnalyticsPostsTool implements AgentToolInterface {
  constructor(private _postMetricsService: PostMetricsService) {}
  name = 'analyticsPostsTool';

  run() {
    return createTool({
      id: 'analyticsPostsTool',
      mcp: {
        annotations: {
          title: 'List Post Analytics',
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
      },
      description: `
Ranked post performance (the same numbers as Analytics → Top 5 posts and Performance per post).
Use this for "top posts", "best post this week", or "how did the post about X do" when you do not have a post id yet.
"date" selects which posts appear by publish date. Numbers are current lifetime totals. Null is unknown, not zero.
Search with "q" against caption, channel name, platform or post id. Pass platform (x, instagram, linkedin-page, …) to keep one network.
topReactions / topComments are always the five strongest in the window, independent of sort.
`,
      inputSchema: z.object({
        date: z
          .union([z.literal(7), z.literal(30), z.literal(90)])
          .optional()
          .describe('Publish-date window in days. Default 30.'),
        sort: z
          .enum(['reactions', 'comments', 'impressions', 'engagement', 'published'])
          .optional()
          .describe('Rank the page by this metric. Default reactions.'),
        dir: z.enum(['asc', 'desc']).optional(),
        page: z.number().int().min(0).optional(),
        limit: z
          .number()
          .int()
          .min(1)
          .max(20)
          .optional()
          .describe('Page size, 1-20. Default 5.'),
        integrationId: z
          .string()
          .optional()
          .describe('Optional channel id from integrationList'),
        platform: z
          .string()
          .optional()
          .describe('Optional provider identifier such as x or instagram'),
        q: z
          .string()
          .optional()
          .describe('Search caption, channel name, platform or post id'),
      }),
      outputSchema: z.object({
        output: z.object({
          syncing: z.boolean(),
          date: z.number(),
          total: z.number(),
          page: z.number(),
          limit: z.number(),
          posts: z.array(agentPostSchema),
          topReactions: z.array(agentPostSchema),
          topComments: z.array(agentPostSchema),
          notes: z.any(),
        }),
      }),
      execute: async (inputData, context) => {
        checkAuth(inputData, context);
        const organizationId = JSON.parse(
          (context?.requestContext as any)?.get('organization') as string
        ).id;

        const list = await this._postMetricsService.listPosts(organizationId, {
          date: inputData.date || 30,
          sort: inputData.sort || 'reactions',
          dir: inputData.dir || 'desc',
          page: inputData.page || 0,
          limit: inputData.limit || 5,
          integrationIds: inputData.integrationId,
          platform: inputData.platform,
          q: inputData.q,
        });

        return {
          output: {
            syncing: list.syncing,
            date: list.date,
            total: list.total,
            page: list.page,
            limit: list.limit,
            posts: list.posts.map(toAgentPost),
            topReactions: list.topReactions.map(toAgentPost),
            topComments: list.topComments.map(toAgentPost),
            notes: ANALYTICS_AGENT_NOTES,
          },
        };
      },
    });
  }
}
