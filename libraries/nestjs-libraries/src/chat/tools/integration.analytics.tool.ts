import { AgentToolInterface } from '@gitroom/nestjs-libraries/chat/agent.tool.interface';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { Injectable } from '@nestjs/common';
import { IntegrationService } from '@gitroom/nestjs-libraries/database/prisma/integrations/integration.service';
import { checkAuth } from '@gitroom/nestjs-libraries/chat/auth.context';

@Injectable()
export class IntegrationAnalyticsTool implements AgentToolInterface {
  constructor(private _integrationService: IntegrationService) {}
  name = 'integrationAnalyticsTool';
  optionalOnSelfHosted = true;

  run() {
    return createTool({
      id: 'integrationAnalyticsTool',
      mcp: {
        annotations: {
          title: 'Channel Analytics',
          readOnlyHint: false,
          destructiveHint: true,
          idempotentHint: true,
          openWorldHint: true,
        },
      },
      description: `
Get the analytics of one channel (integration) for the last days, for example followers, impressions and engagement (the same data as the "Channel Analytics" API endpoint).
Pass the channel "id" from the integrationList tool.
The metrics differ per platform - each one has a "label" and a list of data points.
The data is loaded from the platform and kept for up to an hour, so calling again within the hour returns the same numbers.
An empty list means the platform has no analytics, returned nothing for this period, or the channel has to be reconnected.
If the channel is not found, the result contains output.errors.
`,
      inputSchema: z.object({
        id: z.string().describe('The "id" of the channel (integration)'),
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
        const org = JSON.parse(
          (context?.requestContext as any)?.get('organization') as string
        );

        try {
          const analytics = await this._integrationService.checkAnalytics(
            org,
            inputData.id,
            String(inputData.days || 7)
          );

          return {
            output: {
              analytics: (analytics || []).map((p) => ({
                label: p.label || '',
                percentageChange: p.percentageChange || 0,
                data: (p.data || []).map((d) => ({
                  total: String(d.total ?? ''),
                  date: String(d.date),
                })),
              })),
            },
          };
        } catch (err: any) {
          return { output: { errors: err?.message || 'Channel not found' } };
        }
      },
    });
  }
}
