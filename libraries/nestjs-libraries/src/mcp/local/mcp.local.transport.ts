import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';

export class McpLocalTransport implements Transport {
  peer?: McpLocalTransport;
  onmessage?: (msg: any) => void;
  onclose?: () => void;
  onerror?: (err: Error) => void;

  async start() {}

  async send(message: any) {
    this.peer?.onmessage?.(message);
  }

  async close() {
    this.onclose?.();
  }
}
