import { AgentToolInterface } from '@gitroom/nestjs-libraries/chat/agent.tool.interface';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { Injectable } from '@nestjs/common';
import { PostsService } from '@gitroom/nestjs-libraries/database/prisma/posts/posts.service';
import { checkAuth } from '@gitroom/nestjs-libraries/chat/auth.context';

@Injectable()
export class PostSettingsTool implements AgentToolInterface {
  constructor(private _postsService: PostsService) {}
  name = 'postSettingsTool';

  run() {
    return createTool({
      id: 'postSettingsTool',
      mcp: {
        annotations: {
          title: 'Update Post Settings',
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: false,
          openWorldHint: true,
        },
      },
      description: `
Update the provider settings of an existing post (scheduled or draft) that was NOT published yet.
Only the settings change - the content and the publish date stay exactly as they are.
Find the post first (list your posts) and pass its "id" here.
The settings are merged into the existing ones, so only pass the keys you want to change; anything you don't pass stays as it is.
This relies on the integrationSchema tool [input:settings] to know which keys exist for the platform.
If the tool returns errors, rerun it with the right parameters, don't ask again, just run it.
`,
      inputSchema: z.object({
        id: z
          .string()
          .describe('The "id" of the post to update its settings'),
        settings: z
          .array(
            z.object({
              key: z.string().describe('Name of the settings key to change'),
              value: z
                .any()
                .describe(
                  'New value of the key, always prefer the id then label if possible'
                ),
            })
          )
          .describe(
            'Settings keys to change, merged into the existing settings. This relies on the integrationSchema tool [input:settings]'
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

        const settings = (inputData.settings || []).reduce(
          (acc: Record<string, any>, s: { key: string; value: any }) => ({
            ...acc,
            [s.key]: s.value,
          }),
          {} as Record<string, any>
        );

        try {
          const output = await this._postsService.updatePostSettings(
            organizationId,
            inputData.id,
            settings,
            'MCP'
          );

          return { output };
        } catch (err: any) {
          return {
            output: {
              errors: err?.message || 'Failed to update the post settings',
            },
          };
        }
      },
    });
  }
}
