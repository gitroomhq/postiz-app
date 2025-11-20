import type { ZodLikeSchema } from '@mastra/core/dist/types/zod-compat';
import type {
  ToolExecutionContext,
} from '@mastra/core/dist/tools/types';
import { Tool } from '@mastra/core/dist/tools/tool';

export type ToolReturn = Tool<
  ZodLikeSchema,
  ZodLikeSchema,
  ZodLikeSchema,
  ZodLikeSchema,
  ToolExecutionContext<ZodLikeSchema, ZodLikeSchema, ZodLikeSchema>
>;

export interface AgentToolInterface {
  name: string;
  run(): ToolReturn;
}
