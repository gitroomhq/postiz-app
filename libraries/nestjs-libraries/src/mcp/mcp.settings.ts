import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { MainMcp } from '@gitroom/backend/mcp/main.mcp';
import { socialIntegrationList } from '@gitroom/nestjs-libraries/integrations/integration.manager';

export class McpSettings {
  private _server: McpServer;
  createServer(organization: string, service: MainMcp) {
    this._server = new McpServer(
      {
        name: 'Postiz',
        version: '2.0.0',
      },
      {
        instructions: `Postiz is a service to schedule social media posts for ${socialIntegrationList
          .map((p) => p.name)
          .join(
            ', '
          )} to schedule you need to have the providerId (you can get it from POSTIZ_PROVIDERS_LIST), user need to specify the schedule date (or now), text, you also can send base64 images and text for the comments. When you get POSTIZ_PROVIDERS_LIST, always display all the options to the user`,
      }
    );

    for (const usePrompt of Reflect.getMetadata(
      'MCP_PROMPT',
      MainMcp.prototype
    ) || []) {
      const list = [
        usePrompt.data.promptName,
        usePrompt.data.zod,
        async (...args: any[]) => {
          return {
            // @ts-ignore
            messages: await service[usePrompt.func as string](
              organization,
              ...args
            ),
          };
        },
      ].filter((f) => f);
      this._server.prompt(...(list as [any, any, any]));
    }

    for (const usePrompt of Reflect.getMetadata(
      'MCP_TOOL',
      MainMcp.prototype
    ) || []) {
      const list: any[] = [
        usePrompt.data.toolName,
        usePrompt.data.zod,
        async (...args: any[]) => {
          return {
            // @ts-ignore
            content: await service[usePrompt.func as string](
              organization,
              ...args
            ),
          };
        },
      ].filter((f) => f);

      this._server.tool(...(list as [any, any, any]));
    }

    return this;
  }

  server() {
    return this._server;
  }

  static load(organization: string, service: MainMcp): McpSettings {
    return new McpSettings().createServer(organization, service);
  }
}
