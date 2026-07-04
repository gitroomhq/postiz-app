import { AgentToolInterface } from '@gitroom/nestjs-libraries/chat/agent.tool.interface';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { Injectable } from '@nestjs/common';
import {
  IntegrationManager,
  socialIntegrationList,
} from '@gitroom/nestjs-libraries/integrations/integration.manager';
import { checkAuth } from '@gitroom/nestjs-libraries/chat/auth.context';

@Injectable()
export class IntegrationValidationTool implements AgentToolInterface {
  constructor(private _integrationManager: IntegrationManager) {}
  name = 'integrationSchema';

  run() {
    return createTool({
      id: 'integrationSchema',
      description: `Everytime we want to schedule a social media post, we need to understand the schema of the integration.
         This tool helps us get the schema of the integration.
         Sometimes we might get a schema back the requires some id, for that, you can get information from 'tools'
         And use the triggerTool function.
        `,
      mcp: {
        annotations: {
          title: 'Get Integration Schema',
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
      },
      inputSchema: z.object({
        isPremium: z
          .boolean()
          .describe('is this the user premium? if not, set to false'),
        platform: z
          .string()
          .describe(
            `platform identifier (${socialIntegrationList
              .map((p) => p.identifier)
              .join(', ')})`
          ),
      }),
      outputSchema: z.object({
        output: z.object({
          rules: z.string(),
          maxLength: z
            .number()
            .describe('The maximum length of a post / comment'),
          settings: z
            .any()
            .describe('List of settings need to be passed to schedule a post'),
          tools: z
            .array(
              z.object({
                description: z.string().describe('Description of the tool'),
                methodName: z
                  .string()
                  .describe('Method to call to get the information'),
                dataSchema: z
                  .array(
                    z.object({
                      key: z
                        .string()
                        .describe('Name of the settings key to pass'),
                      description: z
                        .string()
                        .describe('Description of the setting key'),
                      type: z.string(),
                    })
                  )
                  .describe(
                    'This will be passed to schedulePostTool [output:settings]'
                  ),
              })
            )
            .describe(
              "Sometimes settings require some id, tags and stuff, if you don't have, trigger the `triggerTool` function from the tools list [output:callable-tools]"
            ),
          capabilities: z
            .object({
              scheduling: z.boolean(),
              comments: z.boolean(),
              mentions: z.boolean(),
              accountAnalytics: z.boolean(),
              postAnalytics: z.boolean(),
              missingContent: z.boolean(),
              profilePicture: z.boolean(),
              nickname: z.boolean(),
              customFields: z.boolean(),
              externalUrl: z.boolean(),
              web3: z.boolean(),
              chromeExtension: z.boolean(),
              oneTimeToken: z.boolean(),
              refreshCron: z.boolean(),
              refreshWait: z.boolean(),
              stripLinks: z.boolean(),
              convertToJPEG: z.boolean(),
              editor: z.enum(['none', 'normal', 'markdown', 'html']),
              maxConcurrentJob: z.number(),
              tools: z.array(z.string()),
            })
            .optional()
            .describe(
              'Derived provider capabilities for generic scheduling and integration flows'
            ),
        }),
      }),
      execute: async (inputData, context) => {
        checkAuth(inputData, context);
        const requirements =
          this._integrationManager.getIntegrationRequirements(
            inputData.platform,
            inputData.isPremium
          );

        if (!requirements) {
          return {
            output: { rules: '', maxLength: 0, settings: {}, tools: [] },
          };
        }

        return {
          output: requirements,
        };
      },
    });
  }
}
