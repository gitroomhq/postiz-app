import { AgentToolInterface } from '@gitroom/nestjs-libraries/chat/agent.tool.interface';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { Injectable } from '@nestjs/common';
import { PostsService } from '@gitroom/nestjs-libraries/database/prisma/posts/posts.service';
import { checkAuth } from '@gitroom/nestjs-libraries/chat/auth.context';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import {
  attachment,
  toMedia,
} from '@gitroom/nestjs-libraries/chat/tools/integration.schedule.post';

@Injectable()
export class PostAttachmentsTool implements AgentToolInterface {
  constructor(private _postsService: PostsService) {}
  name = 'postAttachmentsTool';
  optionalOnSelfHosted = true;

  run() {
    return createTool({
      id: 'postAttachmentsTool',
      mcp: {
        annotations: {
          title: 'Update Post Attachments',
          readOnlyHint: false,
          destructiveHint: true,
          idempotentHint: false,
          openWorldHint: false,
        },
      },
      description: `
Replace the attachments (media) of an existing post (scheduled or draft) that was NOT published yet.
Only the attachments change - the content, the settings and the publish date stay exactly as they are.
Find the post first (list your posts) and pass its "id" here.
The attachments you pass REPLACE all the existing ones: pass the full list the post should have, anything you don't pass is removed, and an empty list removes all the attachments.
Only the attachments of the main post are changed, the attachments of its comments stay as they are.
If validation fails, the result contains output.errors describing what to fix; the call can be retried with corrected parameters.
`,
      inputSchema: z.object({
        id: z
          .string()
          .describe('The "id" of the post to replace its attachments'),
        attachments: z
          .array(attachment)
          .describe(
            'The full new list of media of the post, an empty list removes all of it: either an uploaded media URL string, or { path, alt?, thumbnail?, thumbnailTimestamp? } where path is the uploaded media URL, alt is its alt text, thumbnail is the path of an uploaded jpeg/png (returned by uploadFromUrlTool) used as the video thumbnail / cover, and thumbnailTimestamp is the video frame to use as the cover, in milliseconds'
          ),
      }),
      outputSchema: z.object({
        output: z
          .object({
            postId: z.string(),
            publishDate: z.string(),
          })
          .or(z.object({ errors: z.string() })),
      }),
      execute: async (inputData, context) => {
        checkAuth(inputData, context);
        const organizationId = JSON.parse(
          (context?.requestContext as any)?.get('organization') as string
        ).id;

        try {
          const output = await this._postsService.updatePostAttachments(
            organizationId,
            inputData.id,
            (inputData.attachments || []).map((a: any) => ({
              id: makeId(10),
              ...toMedia(a),
            })),
            'MCP'
          );

          return { output };
        } catch (err: any) {
          return {
            output: {
              errors: err?.message || 'Failed to update the post attachments',
            },
          };
        }
      },
    });
  }
}
