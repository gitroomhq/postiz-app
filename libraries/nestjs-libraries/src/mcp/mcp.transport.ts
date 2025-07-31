import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { McpService } from '@gitroom/nestjs-libraries/mcp/mcp.service';
import {
  JSONRPCMessage,
  JSONRPCMessageSchema,
} from '@gitroom/nestjs-libraries/mcp/mcp.types';

export class McpTransport implements Transport {
  constructor(private _organization: string) {}

  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage) => void;

  async start() {}

  async send(message: JSONRPCMessage): Promise<void> {
    McpService.event.emit(`organization-${this._organization}`, {
      type: 'message',
      data: JSON.stringify(message),
    });
  }

  async close() {
    McpService.event.removeAllListeners(`organization-${this._organization}`);
  }

  handlePostMessage(message: any) {
    let parsedMessage: JSONRPCMessage;

    try {
      parsedMessage = JSONRPCMessageSchema.parse(message);
    } catch (error) {
      this.onerror?.(error as Error);
      throw error;
    }

    this.onmessage?.(parsedMessage);
  }

  get sessionId() {
    return this._organization;
  }
}
