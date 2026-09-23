import { AgentToolInterface } from '@gitroom/nestjs-libraries/chat/agent.tool.interface';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { Injectable } from '@nestjs/common';
import { PostsService } from '@gitroom/nestjs-libraries/database/prisma/posts/posts.service';
import { checkAuth } from '@gitroom/nestjs-libraries/chat/auth.context';

@Injectable()
export class DeletePostTool implements AgentToolInterface {
  constructor(private _postsService: PostsService) {}
  name = 'deletePostTool';

  run() {
    return createTool({
      id: 'deletePostTool',
      mcp: {
        annotations: {
          title: 'Delete Post',
          readOnlyHint: false,
          destructiveHint: true,
          idempotentHint: false,
          openWorldHint: false,
        },
      },
      description: `
Delete an existing post (the same as the "Delete Post" API endpoint). This cannot be undone.
Find the post first (list your posts) and pass its "id" here, one post per call.
It deletes the post together with all of its thread items / comments. A post that was scheduled to several channels is a separate post per channel, each with its own "id" - deleting one leaves the others in place.
A post that was already published is only removed from Postiz - it stays live on the social network.
Always show the user which post(s) will be deleted and get their explicit confirmation before calling this tool.
If it fails, the result contains output.errors.
`,
      inputSchema: z.object({
        id: z.string().describe('The "id" of the post to delete'),
      }),
      outputSchema: z.object({
        output: z
          .object({
            id: z.string(),
          })
          .or(z.object({ errors: z.string() })),
      }),
      execute: async (inputData, context) => {
        checkAuth(inputData, context);
        const organizationId = JSON.parse(
          (context?.requestContext as any)?.get('organization') as string
        ).id;

        try {
          const post = await this._postsService.getPost(
            organizationId,
            inputData.id
          );

          if (!post?.group) {
            return { output: { errors: 'Post not found' } };
          }

          await this._postsService.deletePost(organizationId, post.group);

          return { output: { id: inputData.id } };
        } catch (err: any) {
          return {
            output: {
              errors: 'Post not found or failed to delete',
            },
          };
        }
      },
    });
  }
}
