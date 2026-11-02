import { AgentToolInterface } from '@gitroom/nestjs-libraries/chat/agent.tool.interface';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { Injectable } from '@nestjs/common';
import {
  IntegrationManager,
  socialIntegrationList,
} from '@gitroom/nestjs-libraries/integrations/integration.manager';
import { IntegrationService } from '@gitroom/nestjs-libraries/database/prisma/integrations/integration.service';
import { RefreshToken } from '@gitroom/nestjs-libraries/integrations/social.abstract';
import { timer } from '@gitroom/helpers/utils/timer';
import { checkAuth } from '@gitroom/nestjs-libraries/chat/auth.context';
import { RefreshIntegrationService } from '@gitroom/nestjs-libraries/integrations/refresh.integration.service';

@Injectable()
export class IntegrationTriggerTool implements AgentToolInterface {
  constructor(
    private _integrationManager: IntegrationManager,
    private _integrationService: IntegrationService,
    private _refreshIntegrationService: RefreshIntegrationService
  ) {}
  name = 'triggerTool';

  run() {
    return createTool({
      id: 'triggerTool',
      description: `Use this to call a provider helper function (a methodName from the integrationSchema callable tools) that fetches provider-specific data needed for settings, like ids or search results.
      Some helper functions require values provided by the user, like a word to search for. methodName is required [input:callable-tools].
      If provider auth is expired, this tool may refresh the stored integration token; if refresh fails, it marks the channel as needing reconnect and notifies the organization.`,
      mcp: {
        annotations: {
          title: 'Trigger Integration Tool',
          readOnlyHint: false,
          destructiveHint: true,
          idempotentHint: false,
          openWorldHint: true,
        },
      },
      inputSchema: z.object({
        integrationId: z.string().describe('The id of the integration'),
        methodName: z
          .string()
          .describe(
            'The methodName from the `integrationSchema` functions in the tools array, required'
          ),
        dataSchema: z.array(
          z.object({
            key: z.string().describe('Name of the settings key to pass'),
            value: z.string().describe('Value of the key'),
          })
        ),
      }),
      outputSchema: z.object({
        output: z.union([
          z.array(z.record(z.string(), z.any())),
          z.record(z.string(), z.any()),
          z.string(),
        ]),
      }),
      execute: async (inputData, context) => {
        checkAuth(inputData, context);
        const organizationId = JSON.parse(
          (context?.requestContext as any)?.get('organization') as string
        ).id;

        const getIntegration =
          await this._integrationService.getIntegrationById(
            organizationId,
            inputData.integrationId
          );

        if (!getIntegration) {
          throw new Error(
            'Integration not found, use integrationList to get a valid integration id'
          );
        }

        const integrationProvider = socialIntegrationList.find(
          (p) => p.identifier === getIntegration.providerIdentifier
        )!;

        if (!integrationProvider) {
          throw new Error(
            'Integration provider not found, use integrationList to get a valid integration id'
          );
        }

        const tools = this._integrationManager.getAllTools();
        if (
          // @ts-ignore
          !tools[integrationProvider.identifier].some(
            (p) => p.methodName === inputData.methodName
          ) ||
          // @ts-ignore
          !integrationProvider[inputData.methodName]
        ) {
          throw new Error(
            `Method "${inputData.methodName}" not found for this integration, use integrationSchema to get the callable tools`
          );
        }

        let refreshed = false;
        while (true) {
          try {
            // @ts-ignore
            const load = await integrationProvider[inputData.methodName](
              getIntegration.token,
              inputData.dataSchema.reduce(
                (all: Record<string, string>, current: { key: string; value: string }) => ({
                  ...all,
                  [current.key]: current.value,
                }),
                {} as Record<string, string>
              ),
              getIntegration.internalId,
              getIntegration
            );

            return { output: load };
          } catch (err) {
            if (err instanceof RefreshToken && !refreshed) {
              refreshed = true;
              const data = await this._refreshIntegrationService.refresh(
                getIntegration
              );

              if (!data) {
                await this._integrationService.disconnectChannel(
                  organizationId,
                  getIntegration
                );
                throw new Error(
                  'The channel was disconnected because its token expired, the user needs to reconnect it in Postiz'
                );
              }

              const { accessToken } = data;

              if (accessToken) {
                getIntegration.token = accessToken;

                if (integrationProvider.refreshWait) {
                  await timer(10000);
                }

                continue;
              }
            }

            if (err instanceof RefreshToken) {
              throw new Error(
                'The provider rejected the credentials even after refreshing the token, the user needs to reconnect the channel in Postiz'
              );
            }

            throw new Error(
              `Provider call failed: ${
                err instanceof Error && err.message
                  ? err.message
                  : 'unexpected error'
              }`
            );
          }
        }
      },
    });
  }
}
