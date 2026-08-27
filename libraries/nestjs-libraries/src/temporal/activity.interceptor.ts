import { Context } from '@temporalio/activity';
import type {
  ActivityExecuteInput,
  ActivityInterceptorsFactory,
  Next,
  ActivityInboundCallsInterceptor,
} from '@temporalio/worker';
import { logger, errorType, errorMessage } from '@gitroom/nestjs-libraries/sentry/logger';

const activityAttributes = (ctx: Context) => ({
  activity_name: ctx.info.activityType,
  activity_attempt: ctx.info.attempt,
  workflow_id: ctx.info.workflowExecution.workflowId,
  workflow_run_id: ctx.info.workflowExecution.runId,
  workflow_type: ctx.info.workflowType,
  task_queue: ctx.info.taskQueue,
});

export const activityLogInterceptor: ActivityInterceptorsFactory = (
  ctx: Context
) => ({
  inbound: {
    async execute(
      input: ActivityExecuteInput,
      next: Next<ActivityInboundCallsInterceptor, 'execute'>
    ) {
      const startedAt = Date.now();

      try {
        const result = await next(input);

        logger.info('activity_completed', {
          ...activityAttributes(ctx),
          duration_ms: Date.now() - startedAt,
        });

        return result;
      } catch (err) {
        logger.error('activity_failed', {
          ...activityAttributes(ctx),
          duration_ms: Date.now() - startedAt,
          error_type: errorType(err),
          error_message: errorMessage(err),
        });

        throw err;
      }
    },
  },
});
