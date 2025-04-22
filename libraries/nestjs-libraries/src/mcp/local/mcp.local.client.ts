import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { McpLocalTransport } from '@gitroom/nestjs-libraries/mcp/local/mcp.local.transport';
import { CallToolResult, CallToolResultSchema, CreateMessageRequest, CreateMessageRequestSchema, CreateMessageResult, CreateMessageResultSchema, ListToolsResult, ListToolsResultSchema } from '@gitroom/nestjs-libraries/mcp/mcp.types';

export class McpLocalClient {
  private _client: Client;

  constructor(transport: McpLocalTransport) {
    this._client = new Client({
      name: 'Publica Client',
      version: '2.0.0',
      transport,
     });
  }

  async createMessage(input: CreateMessageRequest['params']) {
    const response = await this._client.request(
      {
        method: 'sampling/createMessage',
        params: input,
      },
      CreateMessageResultSchema 
    );

    return response as CreateMessageResult;
  }

  async listTools() {
    const response = await this._client.request(
      {
        method: 'tools/list',
        params: {},
      },
      ListToolsResultSchema
    );

    return response as ListToolsResult;
  }

  async callTool(name: string, args: any) {
    const response = await this._client.request(
      {
        method: 'tools/call',
        params: {
          name,
          arguments: args,
        },
      },
      CallToolResultSchema
    );

    return response as CallToolResult;
  }

  get client() {
    return this._client;
  }
}
