import { AgentToolInterface } from '@gitroom/nestjs-libraries/chat/agent.tool.interface';
import { createTool } from '@mastra/core/tools';
import { Injectable } from '@nestjs/common';
import { MediaService } from '@gitroom/nestjs-libraries/database/prisma/media/media.service';
import z from 'zod';
import { checkAuth } from '@gitroom/nestjs-libraries/chat/auth.context';

@Injectable()
export class MediaListTool implements AgentToolInterface {
  constructor(private _mediaService: MediaService) {}
  name = 'mediaListTool';

  run() {
    return createTool({
      id: 'mediaListTool',
      description: `List the media (images and videos) already uploaded to the media library, newest first, 18 per page, optionally searched by original filename.
Use the returned path as an attachment URL in integrationSchedulePostTool instead of uploading the file again.`,
      inputSchema: z.object({
        search: z
          .string()
          .optional()
          .describe('Filter by original filename (case-insensitive contains)'),
        page: z.number().optional().describe('Page number, starting at 1'),
      }),
      mcp: {
        annotations: {
          title: 'List Media',
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
      },
      outputSchema: z.object({
        pages: z.number(),
        output: z.array(
          z.object({
            id: z.string(),
            name: z.string(),
            originalName: z.string().nullable(),
            path: z.string(),
            type: z.string(),
            fileSize: z.number(),
            createdAt: z.string(),
            thumbnail: z.string().nullable(),
          })
        ),
      }),
      execute: async (inputData, context) => {
        checkAuth(inputData, context);
        const organizationId = JSON.parse(
          (context?.requestContext as any)?.get('organization') as string
        ).id;

        const { pages, results } = await this._mediaService.getMedia(
          organizationId,
          inputData.page || 1,
          inputData.search
        );

        return {
          pages,
          output: results.map((p) => ({
            id: p.id,
            name: p.name,
            originalName: p.originalName,
            path: p.path,
            type: p.type,
            fileSize: p.fileSize,
            createdAt: p.createdAt.toISOString(),
            thumbnail: p.thumbnail,
          })),
        };
      },
    });
  }
}
