import { AgentToolInterface } from '@gitroom/nestjs-libraries/chat/agent.tool.interface';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { Injectable } from '@nestjs/common';
import {
  AiWebSearchService,
  MAX_EXTRACT_URLS,
} from '@gitroom/nestjs-libraries/ai/ai-web-search.service';
import { checkAuth } from '@gitroom/nestjs-libraries/chat/auth.context';
import { readRequestContext } from '@gitroom/nestjs-libraries/chat/tools/tool.context.helper';

@Injectable()
export class ExtractUrlsTool implements AgentToolInterface {
  constructor(private _aiWebSearchService: AiWebSearchService) {}
  name = 'extractUrlsTool';

  run() {
    return createTool({
      id: 'extractUrlsTool',
      description:
        'Fetch and extract clean markdown content from one or more URLs. ' +
        'Use when the user provides specific URLs (blog posts, articles, landing pages) ' +
        'and you need to read the content to write a post about it. ' +
        'For broad topic discovery without URLs, use `webSearchTool` instead.',
      inputSchema: z.object({
        urls: z
          .array(z.string().url())
          .min(1)
          .max(MAX_EXTRACT_URLS)
          .describe(
            `List of public http(s) URLs to extract (max ${MAX_EXTRACT_URLS}). ` +
              'Private hostnames (localhost, 192.168.*, 10.*, etc.) are rejected.'
          ),
        extractDepth: z
          .enum(['basic', 'advanced'])
          .optional()
          .describe(
            'basic (default) handles static pages; advanced handles JS-heavy SPAs but costs 2x credits.'
          ),
        query: z
          .string()
          .optional()
          .describe(
            'When provided, Tavily returns only chunks of the page content relevant to this query (focused extraction).'
          ),
      }),
      outputSchema: z.object({
        results: z.array(
          z.object({
            url: z.string(),
            rawContent: z.string(),
          })
        ),
        failedResults: z.array(
          z.object({
            url: z.string(),
            error: z.string(),
          })
        ),
      }),
      execute: async (input: any, options: any) => {
        checkAuth(input, options);
        const requestContext = readRequestContext(options);
        const org = JSON.parse(requestContext.get('organization') as string);
        const profileId = requestContext.get('profileId') as string | undefined;

        const result = await this._aiWebSearchService.extract(
          org.id,
          input.urls,
          profileId,
          {
            extractDepth: input.extractDepth,
            format: 'markdown',
            query: input.query,
          }
        );

        return {
          results: (result.results ?? []).map((r: any) => ({
            url: r.url ?? '',
            rawContent: r.rawContent ?? r.raw_content ?? '',
          })),
          failedResults: (result.failedResults ?? []).map((f: any) => ({
            url: f.url ?? '',
            error: f.error ?? 'unknown',
          })),
        };
      },
    });
  }
}
