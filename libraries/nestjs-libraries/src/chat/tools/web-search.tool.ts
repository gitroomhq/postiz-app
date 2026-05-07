import { AgentToolInterface } from '@gitroom/nestjs-libraries/chat/agent.tool.interface';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { Injectable } from '@nestjs/common';
import { AiWebSearchService } from '@gitroom/nestjs-libraries/ai/ai-web-search.service';
import { checkAuth } from '@gitroom/nestjs-libraries/chat/auth.context';
import { readRequestContext } from '@gitroom/nestjs-libraries/chat/tools/tool.context.helper';

@Injectable()
export class WebSearchTool implements AgentToolInterface {
  constructor(private _aiWebSearchService: AiWebSearchService) {}
  name = 'webSearchTool';

  run() {
    return createTool({
      id: 'webSearchTool',
      description:
        'Search the public web for information. ' +
        "Use ONLY when the topic is about external/world events, news, public figures, " +
        "third-party products/companies, or anything you don't have first-party context for. " +
        "NEVER use for facts about the USER's own brand/product/service — call " +
        '`knowledgeBaseQuery` first for that. ' +
        'When the user provides specific URLs, prefer `extractUrlsTool` instead.',
      inputSchema: z.object({
        query: z
          .string()
          .min(2)
          .describe('Search query in natural language'),
        maxResults: z
          .number()
          .int()
          .min(1)
          .max(10)
          .optional()
          .describe('Max number of results to return (default 5).'),
        topic: z
          .enum(['general', 'news', 'finance'])
          .optional()
          .describe(
            'Restrict results to a topic. Use `news` for recent events, `finance` for stock/markets.'
          ),
        days: z
          .number()
          .int()
          .min(1)
          .max(30)
          .optional()
          .describe('Restrict to results published in the last N days.'),
        includeAnswer: z
          .boolean()
          .optional()
          .describe(
            'When true, Tavily returns an AI-generated `answer` string in addition to results. Useful for direct facts.'
          ),
      }),
      outputSchema: z.object({
        answer: z.string().optional(),
        results: z.array(
          z.object({
            title: z.string(),
            url: z.string(),
            content: z.string(),
            score: z.number().optional(),
          })
        ),
      }),
      execute: async (input: any, options: any) => {
        checkAuth(input, options);
        const requestContext = readRequestContext(options);
        const org = JSON.parse(requestContext.get('organization') as string);
        const profileId = requestContext.get('profileId') as string | undefined;

        const result = await this._aiWebSearchService.search(
          org.id,
          input.query,
          profileId,
          {
            maxResults: input.maxResults,
            topic: input.topic,
            days: input.days,
            includeAnswer: input.includeAnswer,
          }
        );

        return {
          answer: (result as any).answer ?? undefined,
          results: (result.results ?? []).map((r: any) => ({
            title: r.title ?? '',
            url: r.url ?? '',
            content: r.content ?? '',
            score: typeof r.score === 'number' ? r.score : undefined,
          })),
        };
      },
    });
  }
}
