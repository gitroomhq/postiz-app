import {
  AgentToolInterface,
  ToolReturn,
} from '@gitroom/nestjs-libraries/chat/agent.tool.interface';
import { createTool } from '@mastra/core/tools';
import { Injectable } from '@nestjs/common';
import { PostsService } from '@gitroom/nestjs-libraries/database/prisma/posts/posts.service';
import z from 'zod';
import { checkAuth } from '@gitroom/nestjs-libraries/chat/auth.context';

@Injectable()
export class DeletePostTool implements AgentToolInterface {
  constructor(private _postsService: PostsService) {}
  name = 'deletePostTool';

  run() {
    return createTool({
      id: 'deletePostTool',
      description: `This tool deletes a scheduled or draft post by its post ID`,
      inputSchema: z.object({
        postId: z.string().describe('The ID of the post to delete'),
      }),
      outputSchema: z.object({
        success: z.boolean(),
        message: z.string(),
      }),
      execute: async (args, options) => {
        const { context, runtimeContext } = args;
        checkAuth(args, options);
        const organizationId = JSON.parse(
          // @ts-ignore
          runtimeContext.get('organization') as string
        ).id;

        const post = await this._postsService.getPost(
          organizationId,
          context.postId
        );

        if (!post || !post.group) {
          return {
            success: false,
            message: `Post with ID ${context.postId} not found`,
          };
        }

        await this._postsService.deletePost(organizationId, post.group);

        return {
          success: true,
          message: `Post ${context.postId} deleted successfully`,
        };
      },
    });
  }
}
