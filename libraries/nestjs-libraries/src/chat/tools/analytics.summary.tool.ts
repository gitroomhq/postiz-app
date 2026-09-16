import { AgentToolInterface } from '@gitroom/nestjs-libraries/chat/agent.tool.interface';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { Injectable } from '@nestjs/common';
import { checkAuth } from '@gitroom/nestjs-libraries/chat/auth.context';
import {
  ANALYTICS_AGENT_NOTES,
  PostMetricsService,
} from '@gitroom/nestjs-libraries/database/prisma/analytics/post-metrics.service';

@Injectable()
export class AnalyticsSummaryTool implements AgentToolInterface {
  constructor(private _postMetricsService: PostMetricsService) {}
  name = 'analyticsSummaryTool';

  run() {
    return createTool({
      id: 'analyticsSummaryTool',
      mcp: {
        annotations: {
          title: 'Analytics Summary',
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
      },
      description: `
Workspace totals for published posts (the same numbers as Analytics → All channels → Summary).
"date" selects which posts appear by publish date (7, 30 or 90 days). The totals are current lifetime counts, not "likes that happened inside this window".
Null is unknown, never zero: Facebook comments are not returned, Pinterest has impressions only, Google Business has no per-post metrics.
Use this for questions like "how did we do this month" or "total impressions on Instagram".
`,
      inputSchema: z.object({
        date: z
          .union([z.literal(7), z.literal(30), z.literal(90)])
          .optional()
          .describe('Publish-date window in days. Default 30.'),
        integrationId: z
          .string()
          .optional()
          .describe('Optional channel id from integrationList, to limit to one channel'),
        platform: z
          .string()
          .optional()
          .describe('Optional provider identifier such as x, instagram, linkedin-page'),
      }),
      outputSchema: z.object({
        output: z.object({
          syncing: z.boolean(),
          date: z.number(),
          posts: z.number(),
          reactions: z.number().nullable(),
          comments: z.number().nullable(),
          impressions: z.number().nullable(),
          notes: z.any(),
        }),
      }),
      execute: async (inputData, context) => {
        checkAuth(inputData, context);
        const organizationId = JSON.parse(
          (context?.requestContext as any)?.get('organization') as string
        ).id;

        const summary = await this._postMetricsService.summary(organizationId, {
          date: inputData.date || 30,
          integrationIds: inputData.integrationId,
          platform: inputData.platform,
        });

        return {
          output: {
            ...summary,
            notes: ANALYTICS_AGENT_NOTES,
          },
        };
      },
    });
  }
}
