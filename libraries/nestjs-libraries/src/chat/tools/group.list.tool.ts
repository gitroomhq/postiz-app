import { AgentToolInterface } from '@gitroom/nestjs-libraries/chat/agent.tool.interface';
import { createTool } from '@mastra/core/tools';
import { Injectable } from '@nestjs/common';
import { IntegrationService } from '@gitroom/nestjs-libraries/database/prisma/integrations/integration.service';
import z from 'zod';
import { checkAuth } from '@gitroom/nestjs-libraries/chat/auth.context';

@Injectable()
export class GroupListTool implements AgentToolInterface {
  constructor(private _integrationService: IntegrationService) {}
  name = 'groupList';

  run() {
    return createTool({
      id: 'groupList',
      description: `This tool lists the available groups (customers). Use a group id with the integrationList tool to filter the integrations belonging to that group`,
      inputSchema: z.object({}),
      mcp: {
        annotations: {
          title: 'List Groups',
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
      },
      outputSchema: z.object({
        output: z.array(
          z.object({
            id: z.string(),
            name: z.string(),
          })
        ),
      }),
      execute: async (inputData, context) => {
        checkAuth(inputData, context);
        const organizationId = JSON.parse(
          (context?.requestContext as any)?.get('organization') as string
        ).id;

        return {
          output: (await this._integrationService.customers(organizationId)).map(
            (p) => ({
              id: p.id,
              name: p.name,
            })
          ),
        };
      },
    });
  }
}
