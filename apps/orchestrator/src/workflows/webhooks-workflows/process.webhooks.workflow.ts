import { WebhooksActivity } from '@gitroom/orchestrator/activities/webhooks.activity';
import { PostActivity } from '@gitroom/orchestrator/activities/post.activity';
import {
  ActivityFailure,
  ApplicationFailure,
  proxyActivities,
  condition,
  sleep,
  defineSignal,
  setHandler,
  continueAsNew,
  workflowInfo,
} from '@temporalio/workflow';

export interface WebhookEvent {
  postId: string;
  commentId: string;
  text: string;
}

export const newWebhookEvent = defineSignal<[WebhookEvent]>('newWebhookEvent');

const proxyTaskQueue = (taskQueue: string) => {
  return proxyActivities<WebhooksActivity>({
    startToCloseTimeout: '10 minute',
    taskQueue,
    retry: {
      maximumAttempts: 3,
      backoffCoefficient: 1,
      initialInterval: '2 minutes',
    },
  });
};

const proxyPostTaskQueue = (taskQueue: string) => {
  return proxyActivities<PostActivity>({
    startToCloseTimeout: '10 minute',
    taskQueue,
    retry: {
      maximumAttempts: 3,
      backoffCoefficient: 1,
      initialInterval: '2 minutes',
    },
  });
};

const iterate = Array.from({ length: 3 });

export async function processWebhooks({
  taskQueue,
  platform,
  queue = [],
}: {
  taskQueue: string;
  platform: string;
  queue?: WebhookEvent[];
}) {
  // Dynamic task queue, activities run on the provider queue for concurrency
  const { matchWebhookEvents, runWebhook } = proxyTaskQueue(taskQueue);
  const { refreshTokenWithCause } = proxyPostTaskQueue(taskQueue);

  setHandler(newWebhookEvent, (event) => {
    queue.push(event);
  });

  while (true) {
    // wait until at least one webhook event arrives
    await condition(() => queue.length > 0);

    // let the queue fill up with more webhook events
    await sleep('3 minutes');

    // take everything that accumulated and clear the queue
    const events = queue.splice(0, queue.length);

    try {
      // match the events to posts / automations, without running them
      const toProcess = await matchWebhookEvents(platform, events);

      // items of the same integration share the same token, they must run
      // sequentially so a refreshed token applies to all of them
      const groups = toProcess.reduce((all, current) => {
        all[current.integration.id] = [
          ...(all[current.integration.id] || []),
          current,
        ];
        return all;
      }, {} as Record<string, typeof toProcess>);

      // run the integrations concurrently, one activity per event
      await Promise.all(
        Object.values(groups).map(async (items) => {
          const integration = items[0].integration;

          // the user has to reconnect the channel, nothing to do
          if (integration.refreshNeeded) {
            return;
          }

          for (const item of items) {
            // always run with the freshest token
            item.integration = integration;

            let unrecoverable = false;
            // this is a small trick to repeat the action in case of token refresh
            for (const _ of iterate) {
              try {
                await runWebhook(platform, item);
              } catch (err) {
                // if token refresh is needed, do it and repeat
                if (
                  err instanceof ActivityFailure &&
                  err.cause instanceof ApplicationFailure &&
                  err.cause.type === 'refresh_token'
                ) {
                  const refresh = await refreshTokenWithCause(
                    integration,
                    err?.cause?.message || ''
                  );
                  if (!refresh || !refresh.accessToken) {
                    unrecoverable = true;
                    break;
                  }

                  integration.token = refresh.accessToken;
                  continue;
                }

                // bad body and any other error, the already processed actions
                // of this event should never run twice
                break;
              }
              break;
            }

            // the token can not be refreshed, the rest of the items of this
            // integration will fail the same way
            if (unrecoverable) {
              break;
            }
          }
        })
      );
    } catch (err) {
      // matching failures are transient (database), put the events back so
      // the next iteration retries them instead of losing the batch
      queue.unshift(...events);
    }

    // keep the history small, carry over events that arrived while processing
    if (workflowInfo().continueAsNewSuggested) {
      await continueAsNew<typeof processWebhooks>({
        taskQueue,
        platform,
        queue: queue.splice(0, queue.length),
      });
    }
  }
}
