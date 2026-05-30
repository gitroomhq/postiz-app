import type { ToolAction } from '@mastra/core/tools';

export type ToolReturn = ToolAction<any, any, any, any, any, any>;

export interface AgentToolInterface {
  name: string;
  run(): ToolReturn;
}
