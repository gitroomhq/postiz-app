import { AgentToolInterface } from '@gitroom/nestjs-libraries/chat/agent.tool.interface';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { Injectable } from '@nestjs/common';
import { PostsService } from '@gitroom/nestjs-libraries/database/prisma/posts/posts.service';
import { checkAuth } from '@gitroom/nestjs-libraries/chat/auth.context';

@Injectable()
export class PostAnalyticsTool implements AgentToolInterface {
  constructor(private _postsService: PostsService) {}
  name = 'postAnalyticsTool';
  optionalOnSelfHosted = true;

  run() {
    return createTool({
      id: 'postAnalyticsTool',
      mcp: {
        annotations: {
          title: 'Post Analytics',
          readOnlyHint: false,
          destructiveHint: true,
          idempotentHint: true,
          openWorldHint: true,
        },
      },
      description: `
Get the analytics of one published post, for example views, likes and comments (the same data as the "Post Analytics" API endpoint).
Find the post first (list your posts) and pass its "id" here - a post created for several channels has a separate id on each channel.
The metrics differ per platform - each one has a "label" and a list of data points.
An empty list means the post was not found, was not published yet, the platform has no post analytics, returned nothing for this period, or the channel has to be reconnected.
If the post is published but Postiz does not know its id on the platform, the result contains output.errors.
`,
      inputSchema: z.object({
        id: z.string().describe('The "id" of the post'),
        days: z
          .number()
          .int()
          .min(1)
          .optional()
          .describe('How many days back to load, for example 7, 30 or 90. Defaults to 7'),
      }),
      outputSchema: z.object({
        output: z
          .object({
            analytics: z.array(
              z.object({
                label: z.string().describe('The metric name'),
                percentageChange: z.number(),
                data: z.array(
                  z.object({
                    total: z.string(),
                    date: z.string(),
                  })
                ),
              })
            ),
          })
          .or(z.object({ errors: z.string() })),
      }),
      execute: async (inputData, context) => {
        checkAuth(inputData, context);
        const organizationId = JSON.parse(
          (context?.requestContext as any)?.get('organization') as string
        ).id;

        const analytics = await this._postsService.checkPostAnalytics(
          organizationId,
          inputData.id,
          inputData.days || 7
        );

        if (!Array.isArray(analytics)) {
          return {
            output: {
              errors:
                'The post is published but it is not linked to its post on the platform, link it from the post statistics in the Postiz app',
            },
          };
        }

        return {
          output: {
            analytics: analytics.map((p) => ({
              label: p.label || '',
              percentageChange: p.percentageChange || 0,
              data: (p.data || []).map((d) => ({
                total: String(d.total ?? ''),
                date: String(d.date),
              })),
            })),
          },
        };
      },
    });
  }
}
