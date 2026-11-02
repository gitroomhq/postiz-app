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
  optionalOnSelfHosted = true;

  run() {
    return createTool({
      id: 'deletePostTool',
      mcp: {
        annotations: {
          title: 'Delete Post',
          readOnlyHint: false,
          destructiveHint: true,
          idempotentHint: true,
          openWorldHint: false,
        },
      },
      description: `
Use this when the user wants to delete an existing post (scheduled, draft, published or errored).
Find the post first (list your posts) and pass its "id" here.
It deletes the post on that one channel together with its comments - a post created for several channels has a separate id on each channel.
A repeating post is listed once per repetition with the same id - deleting it deletes every repetition.
A deleted scheduled post is not published. Deleting a published post only removes it from Postiz - it stays live on the social network.
The deletion cannot be undone.
If the post cannot be deleted, the result contains output.errors explaining why.
`,
      inputSchema: z.object({
        id: z.string().describe('The "id" of the post to delete'),
      }),
      outputSchema: z.object({
        output: z
          .object({
            postId: z.string(),
          })
          .or(z.object({ errors: z.string() })),
      }),
      execute: async (inputData, context) => {
        checkAuth(inputData, context);
        const organizationId = JSON.parse(
          (context?.requestContext as any)?.get('organization') as string
        ).id;

        const [post] = await this._postsService.getPostsRecursively(
          inputData.id,
          false,
          organizationId,
          true
        );

        if (!post) {
          return { output: { errors: 'Post not found' } };
        }

        // deleting goes by group, which a comment shares with its whole thread
        if (post.parentPostId) {
          return {
            output: {
              errors:
                'This id belongs to a comment, pass the id of the main post',
            },
          };
        }

        await this._postsService.deletePost(organizationId, post.group);

        return { output: { postId: post.id } };
      },
    });
  }
}
