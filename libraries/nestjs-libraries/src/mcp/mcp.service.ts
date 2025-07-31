import { Injectable } from '@nestjs/common';
import EventEmitter from 'events';
import { finalize, fromEvent, startWith } from 'rxjs';
import { McpTransport } from '@gitroom/nestjs-libraries/mcp/mcp.transport';
import { JSONRPCMessageSchema } from '@gitroom/nestjs-libraries/mcp/mcp.types';
import { McpSettings } from '@gitroom/nestjs-libraries/mcp/mcp.settings';
import { MainMcp } from '@gitroom/backend/mcp/main.mcp';

@Injectable()
export class McpService {
  static event = new EventEmitter();
  constructor(private _mainMcp: MainMcp) {}

  async runServer(apiKey: string, organization: string) {
    const server = McpSettings.load(organization, this._mainMcp).server();
    const transport = new McpTransport(organization);

    const observer = fromEvent(
      McpService.event,
      `organization-${organization}`
    ).pipe(
      startWith({
        type: 'endpoint',
        data:
          process.env.NEXT_PUBLIC_BACKEND_URL + '/mcp/' + apiKey + '/messages',
      }),
      finalize(() => {
        transport.close();
      })
    );

    await server.connect(transport);

    return observer;
  }

  async processPostBody(organization: string, body: object) {
    const server = McpSettings.load(organization, this._mainMcp).server();
    const message = JSONRPCMessageSchema.parse(body);
    const transport = new McpTransport(organization);
    await server.connect(transport);
    transport.handlePostMessage(message);
    return {};
  }
}
