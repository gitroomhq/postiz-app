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
import { previewText } from '@gitroom/nestjs-libraries/database/prisma/analytics/post-metrics.query';

@Injectable()
export class AnalyticsPostTool implements AgentToolInterface {
  constructor(private _postMetricsService: PostMetricsService) {}
  name = 'analyticsPostTool';

  run() {
    return createTool({
      id: 'analyticsPostTool',
      mcp: {
        annotations: {
          title: 'One Post Analytics',
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
      },
      description: `
Current lifetime totals for one published post (the same snapshot as Analytics → Performance per post).
Use this when the user names a post you already have an id for, from analyticsPostsTool or postsListTool.
Null is unknown, not zero. If error is missing_release, tell the user to connect the published content in the app (Connect Post) — do not invent numbers.
`,
      inputSchema: z.object({
        postId: z.string().describe('Post id from analyticsPostsTool or postsListTool'),
      }),
      outputSchema: z.object({
        output: z.object({
          error: z
            .enum(['not_found', 'missing_release', 'not_published', 'unsupported'])
            .optional(),
          syncing: z.boolean().optional(),
          notes: z.any().optional(),
          id: z.string().optional(),
          state: z.string().optional(),
          platform: z.string().optional(),
          channelName: z.string().optional(),
          publishDate: z.string().optional(),
          content: z.string().optional(),
          post: z
            .object({
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
            })
            .optional(),
        }),
      }),
      execute: async (inputData, context) => {
        checkAuth(inputData, context);
        const organizationId = JSON.parse(
          (context?.requestContext as any)?.get('organization') as string
        ).id;

        const result = await this._postMetricsService.getPost(
          organizationId,
          inputData.postId
        );

        if ('post' in result && result.post) {
          return {
            output: {
              syncing: result.syncing,
              notes: ANALYTICS_AGENT_NOTES,
              post: toAgentPost(result.post),
            },
          };
        }

        return {
          output: {
            ...result,
            notes: ANALYTICS_AGENT_NOTES,
            content:
              'content' in result && result.content
                ? previewText(result.content)
                : undefined,
          },
        };
      },
    });
  }
}
