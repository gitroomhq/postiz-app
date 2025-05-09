import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { MainMcp } from '@gitroom/backend/mcp/main.mcp';
import { OpenaiService } from '@gitroom/nestjs-libraries/openai/openai.service';
import { CreateMessageRequestSchema, TextContent, CallToolRequestSchema, ListToolsRequestSchema } from '@gitroom/nestjs-libraries/mcp/mcp.types';
import zodToJsonSchema from 'zod-to-json-schema';
import { ZodType } from 'zod';
import { localpSystemPrompt } from './local.prompts';

export class McpLocalServer {
  private _server: Server;
  private _tools: any[] = [];

  private constructor() {}

  static load(organization: string, service: MainMcp): McpLocalServer {
    const instance = new McpLocalServer();
    instance.createServer(organization, service);
    return instance;
  }

  private createServer(organization: string, service: MainMcp) {
    this._server = new Server(
      {
        name: 'Publica',
        version: '2.0.0',
  
      },
      {
        capabilities: {
            tools: {},
            sampling: {},
        },
        instructions: localpSystemPrompt,
      }
    );

    this.setupHandlers(organization, service);

    return this;
  }

  private setupHandlers(organization: string, service: MainMcp) {
    this._server.setRequestHandler(CreateMessageRequestSchema, async (request) => {
        console.log(`[MCP Sampling] Organization: ${organization}`);
      
        const openai = new OpenaiService();
      
        const toolsForAI = this._tools.map((tool) => ({
          type: 'function' as const,
          function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.inputSchema,
          },
        }));

        const result = await openai.generateWithTools({
          messages: request.params.messages.map(msg => ({
            role: msg.role,
            content: msg.content.type === 'text' 
              ? { type: 'text', text: msg.content.text }
              : { type: 'text', text: `[Image: ${msg.content.mimeType}]` }
          })),
          systemPrompt: request.params.systemPrompt,
          temperature: request.params.temperature,
          maxTokens: request.params.maxTokens,
          tools: toolsForAI,
        });
      
        if (result.type === 'tool_call') {
          const calledTool = this._tools.find((tool) => tool.name === result.toolName);
          if (!calledTool) {
            throw new Error(`Tool "${result.toolName}" not found`);
          }
      
          const output = await calledTool.func(result.arguments);
      
          if (calledTool.isPrompt) {
            return {
              role: 'assistant',
              messages: output,
              model: 'gpt-4.1-nano',
              stopReason: 'tool',
            };
          } else {
            return {
              role: 'assistant',
              content: output[0],
              model: 'gpt-4.1-nano',
              stopReason: 'tool',
            };
          }
        }
      
        return {
          role: 'assistant',
          content: {
            type: 'text',
            text: result.text,
          },
          model: 'gpt-4.1-nano',
          stopReason: 'endTurn',
        };
      });
      

    const toolMetas = [
      ...(Reflect.getMetadata('MCP_PROMPT', MainMcp.prototype) || []),
      ...(Reflect.getMetadata('MCP_TOOL', MainMcp.prototype) || []),
    ];

    for (const meta of toolMetas) {
      const name = meta.data.promptName || meta.data.toolName;
      if (!name) continue;
      
      this._tools.push({
        name,
        description: meta.data.description || 'No description provided',
        ma: meta.data.zod instanceof ZodType
            ? zodToJsonSchema(meta.data.zod, name)
            : {
                type: 'object',
                properties: {},
            },
        func: async (...args: any[]) => {
          // @ts-ignore
          return await service[meta.func as string](organization, ...args);
        },
        isPrompt: !!meta.data.promptName,
      });
    }

    this._server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: this._tools.map((tool) => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
        })),
      };
    });

    this._server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const calledTool = this._tools.find((tool) => tool.name === request.params.name);
      if (!calledTool) {
        throw new Error(`Tool ${request.params.name} not found`);
      }

      const args = Object.values(request.params.arguments || {});
      const result = await calledTool.func(...args);

      if (calledTool.isPrompt) {
        return { messages: result };
      } else {
        return { content: result };
      }
    });
  }

  server() {
    return this._server;
  }
}
