import {
  AgentToolInterface,
  ToolReturn,
} from '@gitroom/nestjs-libraries/chat/agent.tool.interface';
import { createTool } from '@mastra/core/tools';
import { Injectable } from '@nestjs/common';
import { IntegrationService } from '@gitroom/nestjs-libraries/database/prisma/integrations/integration.service';
import z from 'zod';
import { checkAuth } from '@gitroom/nestjs-libraries/chat/auth.context';
import { getAuth } from '@gitroom/nestjs-libraries/chat/async.storage';
import { readRequestContext } from '@gitroom/nestjs-libraries/chat/tools/tool.context.helper';

@Injectable()
export class IntegrationListTool implements AgentToolInterface {
  constructor(private _integrationService: IntegrationService) {}
  name = 'integrationList';

  run() {
    return createTool({
      id: 'integrationList',
      description: `This tool list available integrations to schedule posts to`,
      outputSchema: z.object({
        output: z.array(
          z.object({
            id: z.string(),
            name: z.string(),
            picture: z.string(),
            platform: z.string(),
          })
        ),
      }),
      execute: async (input: any, options: any) => {
        checkAuth(input, options);
        const requestContext = readRequestContext(options);
        const organizationId = JSON.parse(
          requestContext.get('organization') as string
        ).id;
        const profileId =
          (requestContext.get('profileId') as string) || undefined;

        return {
          output: (
            await this._integrationService.getIntegrationsList(organizationId, profileId)
          ).map((p) => ({
            name: p.name,
            id: p.id,
            disabled: p.disabled,
            picture: p.picture || '/no-picture.jpg',
            platform: p.providerIdentifier,
            display: p.profile,
            type: p.type,
          })),
        };
      },
    });
  }
}
