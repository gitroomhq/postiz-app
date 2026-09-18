import type { ToolAction } from '@mastra/core/tools';

export type ToolReturn = ToolAction<any, any, any, any, any, any>;

export interface AgentToolInterface {
  name: string;
  // needs an MCP host (e.g. renders a ui:// widget), so the in-app agent doesn't get it
  mcpOnly?: boolean;
  run(): ToolReturn;
}
