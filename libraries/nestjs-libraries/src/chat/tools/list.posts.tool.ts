import {
  AgentToolInterface,
  ToolReturn,
} from '@gitroom/nestjs-libraries/chat/agent.tool.interface';
import { createTool } from '@mastra/core/tools';
import { Injectable } from '@nestjs/common';
import { PostsService } from '@gitroom/nestjs-libraries/database/prisma/posts/posts.service';
import z from 'zod';
import { checkAuth } from '@gitroom/nestjs-libraries/chat/auth.context';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
dayjs.extend(utc);

@Injectable()
export class ListPostsTool implements AgentToolInterface {
  constructor(private _postsService: PostsService) {}
  name = 'listPostsTool';

  run() {
    return createTool({
      id: 'listPostsTool',
      description: `This tool lists scheduled, queued, and draft posts. Returns posts from today up to one year ahead by default.`,
      inputSchema: z.object({
        startDate: z
          .string()
          .optional()
          .describe(
            'Start date in ISO format (e.g. 2025-01-01). Defaults to today.'
          ),
        endDate: z
          .string()
          .optional()
          .describe(
            'End date in ISO format (e.g. 2025-12-31). Defaults to one year from today.'
          ),
      }),
      outputSchema: z.object({
        output: z.array(
          z.object({
            id: z.string(),
            content: z.string(),
            publishDate: z.string(),
            state: z.string(),
            group: z.string(),
            integration: z.object({
              id: z.string(),
              name: z.string(),
              providerIdentifier: z.string(),
            }),
          })
        ),
      }),
      execute: async (args, options) => {
        const { context, runtimeContext } = args;
        checkAuth(args, options);
        const organizationId = JSON.parse(
          // @ts-ignore
          runtimeContext.get('organization') as string
        ).id;

        const startDate =
          context.startDate || dayjs.utc().format('YYYY-MM-DD');
        const endDate =
          context.endDate || dayjs.utc().add(1, 'year').format('YYYY-MM-DD');

        const posts = await this._postsService.getPosts(organizationId, {
          startDate,
          endDate,
          customer: '',
        });

        return {
          output: posts.map((p: any) => ({
            id: p.id,
            content: p.content,
            publishDate: p.publishDate
              ? dayjs(p.publishDate).toISOString()
              : '',
            state: p.state,
            group: p.group,
            integration: {
              id: p.integration?.id || '',
              name: p.integration?.name || '',
              providerIdentifier: p.integration?.providerIdentifier || '',
            },
          })),
        };
      },
    });
  }
}
