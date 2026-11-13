import { AgentToolInterface } from '@gitroom/nestjs-libraries/chat/agent.tool.interface';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { HttpException, Injectable } from '@nestjs/common';
import { IntegrationService } from '@gitroom/nestjs-libraries/database/prisma/integrations/integration.service';
import { IntegrationManager } from '@gitroom/nestjs-libraries/integrations/integration.manager';
import { checkAuth } from '@gitroom/nestjs-libraries/chat/auth.context';

@Injectable()
export class IntegrationConnectTool implements AgentToolInterface {
  constructor(
    private _integrationService: IntegrationService,
    private _integrationManager: IntegrationManager
  ) {}
  name = 'integrationConnectTool';
  optionalOnSelfHosted = true;

  run() {
    return createTool({
      id: 'integrationConnectTool',
      mcp: {
        annotations: {
          title: 'Connect Channel',
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: false,
          openWorldHint: false,
        },
      },
      description: `
Use this when the user wants to add (connect) a new social media channel to Postiz: an account, a profile, a page or a business page, for example a Facebook Page, a LinkedIn Page or Google My Business.
It returns the URL of a Postiz page. The user opens it in a browser, reads what connecting the channel means, and continues to the platform to sign in and approve the access.
The channel is added only after the user completes that page, and is listed with the other integrations afterwards. The URL works for one hour.
With a redirectUrl the browser is sent to that address once the channel is connected, and the Postiz page names that website before the user continues. Without it a user who is signed in to Postiz lands on their calendar, and anyone else sees a confirmation that the channel is connected.
It cannot reconnect or refresh an existing channel. Platforms that need an API key, an instance URL, a wallet or the browser extension are added from the Postiz dashboard instead.
If the URL cannot be created, the result contains output.errors explaining why.
`,
      inputSchema: z.object({
        platform: z
          .string()
          .describe(
            `platform identifier (${this._integrationManager
              .getLinkableSocialsIntegrations()
              .join(', ')})`
          ),
        redirectUrl: z
          .string()
          .optional()
          .describe(
            'An http(s) URL, without a #fragment, the browser is sent to once the channel is connected, with "added" (the platform identifier) and "msg" (a short status text) added to its query string. Use it only when the user or the application they are in gave an address to return to.'
          ),
      }),
      outputSchema: z.object({
        output: z
          .object({
            url: z.string(),
          })
          .or(z.object({ errors: z.string() })),
      }),
      execute: async (inputData, context) => {
        checkAuth(inputData, context);
        const organizationId = JSON.parse(
          (context?.requestContext as any)?.get('organization') as string
        ).id;

        try {
          return {
            output: await this._integrationService.createConnectLink(
              organizationId,
              inputData.platform,
              inputData.redirectUrl
            ),
          };
        } catch (err) {
          // a platform that cannot be connected with a link, or a redirect URL
          // that is refused
          if (err instanceof HttpException) {
            return { output: { errors: err.message } };
          }
          throw err;
        }
      },
    });
  }
}
