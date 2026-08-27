import { AgentToolInterface } from '@gitroom/nestjs-libraries/chat/agent.tool.interface';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { Injectable } from '@nestjs/common';
import { PostsService } from '@gitroom/nestjs-libraries/database/prisma/posts/posts.service';
import { checkAuth } from '@gitroom/nestjs-libraries/chat/auth.context';
import { OrganizationService } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.service';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

const parseSettings = (settings: string | null) => {
  try {
    return JSON.parse(settings || '{}');
  } catch (err) {
    return {};
  }
};

@Injectable()
export class PostsListTool implements AgentToolInterface {
  constructor(
    private _postsService: PostsService,
    private _organizationService: OrganizationService
  ) {}
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
"startDate" and "endDate" are required - without an explicit offset / Z they are read in the timezone configured in the user Postiz settings (UTC when none is configured), which is also the timezone every returned publish date is rendered in (see output "timezone"). To list all upcoming posts, pass a wide window (for example from now to a year ahead).
Each item has an "id", its publish date, state, content, channel and current provider settings.
Posts cannot be deleted through the Postiz tools - if the user wants to delete a post, tell them to do it themselves in the Postiz app; never offer to delete a post.
`,
      inputSchema: z.object({
        startDate: z
          .string()
          .describe(
            "Start of the window, for example 2026-07-20T00:00:00 (read in the user's timezone unless it carries an offset)"
          ),
        endDate: z
          .string()
          .describe(
            "End of the window, for example 2026-08-20T00:00:00 (read in the user's timezone unless it carries an offset)"
          ),
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
              publishDate: z
                .string()
                .describe(
                  'The publish date in the "timezone" of the output (UTC when none is configured)'
                ),
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
          timezone: z
            .string()
            .describe('The timezone every publish date is rendered in'),
        }),
      }),
      execute: async (inputData, context) => {
        checkAuth(inputData, context);
        const organizationId = JSON.parse(
          (context?.requestContext as any)?.get('organization') as string
        ).id;

        // Offset-less window dates are interpreted in the user's configured
        // timezone (when set), and every publish date is rendered in it.
        const timezoneName =
          (await this._organizationService.getOrgOwnerTimezone(
            organizationId
          )) || 'UTC';

        const toUtc = (date: string) => {
          if (/(Z|[+-]\d{2}:?\d{2})$/i.test(date)) {
            return date;
          }

          // an unparsable date is left alone so the error stays recognizable
          const shifted = dayjs.tz(date, timezoneName);
          return shifted.isValid()
            ? shifted.utc().format('YYYY-MM-DDTHH:mm:ss')
            : date;
        };

        const posts = await this._postsService.getPosts(organizationId, {
          startDate: toUtc(inputData.startDate),
          endDate: toUtc(inputData.endDate),
          customer: inputData.customer,
        } as any);

        return {
          output: {
            timezone: timezoneName,
            posts: (posts || []).map((p: any) => ({
              id: p.id,
              publishDate: dayjs
                .utc(p.publishDate)
                .tz(timezoneName)
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
