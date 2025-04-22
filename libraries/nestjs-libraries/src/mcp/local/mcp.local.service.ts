import { Injectable } from '@nestjs/common';
import { McpLocalClient } from '@gitroom/nestjs-libraries/mcp/local/mcp.local.client';
import { McpLocalTransport } from '@gitroom/nestjs-libraries/mcp/local/mcp.local.transport';
import { MainMcp } from '@gitroom/backend/mcp/main.mcp';
import { CreateMessageRequest } from '@gitroom/nestjs-libraries/mcp/mcp.types';
import { McpLocalServer } from '@gitroom/nestjs-libraries/mcp/local/mcp.local.server';

interface McpInstance {
  server: ReturnType<McpLocalServer['server']>;
  client: McpLocalClient;
  serverTransport: McpLocalTransport;
  clientTransport: McpLocalTransport;
}

@Injectable()
export class McpLocalService {
  private instances: Map<string, McpInstance> = new Map();

  constructor(
    private readonly mainMcpService: MainMcp,
  ) {}

  private async createInstance(organizationId: string): Promise<McpInstance> {
    const serverTransport = new McpLocalTransport();
    const clientTransport = new McpLocalTransport();

    serverTransport.peer = clientTransport;
    clientTransport.peer = serverTransport;

    const server = McpLocalServer.load(organizationId, this.mainMcpService).server();
    const client = new McpLocalClient(clientTransport);
    
    await server.connect(serverTransport); 
    await client.client.connect(clientTransport); 

    const instance: McpInstance = {
      server,
      client,
      serverTransport,
      clientTransport,
    };

    this.instances.set(organizationId, instance);
    return instance;
  }

  private async getInstance(organizationId: string): Promise<McpInstance> {
    if (!this.instances.has(organizationId)) {
      return await this.createInstance(organizationId);
    }
    
    return this.instances.get(organizationId)!;
  }

  async createMessage(organizationId: string, params: CreateMessageRequest['params']) {
    const instance = await this.getInstance(organizationId);
    return await instance.client.createMessage(params);
  }

  async listTools(organizationId: string) {
    const instance = await this.getInstance(organizationId);
    return await instance.client.listTools();
  }

  async callTool(organizationId: string, name: string, args: any) {
    const instance = await this.getInstance(organizationId);
    return await instance.client.callTool(name, args);
  }
}
