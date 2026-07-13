import { TemporalModule } from 'nestjs-temporal-core';
import { socialIntegrationList } from '@gitroom/nestjs-libraries/integrations/integration.manager';

export const getTemporalModule = (
  isWorkers: boolean,
  path?: string,
  activityClasses?: any[]
) => {
  // Queues this worker server should NOT run, comma-separated
  // (e.g. EXCLUDE_QUEUE="reddit,x,twitch"). Use it to pin a queue to a single
  // server: exclude it on every server except the one that should own it.
  // Meant for the providers whose concurrency is too low to split (limit 1).
  const excludeQueues = (process.env.EXCLUDE_QUEUE || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  // How many worker servers share each (non-excluded) queue. Per-server
  // concurrency is divided by this so the GLOBAL concurrency stays correct.
  // 1 server => 1 (full), 2 servers => 2 (half each), 3 servers => 3, etc.
  const divider = Math.max(
    1,
    Number(process.env.WORKER_CONCURRENCY_DIVIDER) || 1
  );

  // EVERY workflow in this codebase is started on `taskQueue: 'main'`
  // (post.activity.ts:81 and :258, posts.service.ts:731, autopost.service.ts:110,
  // refresh.integration.service.ts:66, email.service.ts:47). The provider name in
  // a workflow's args routes its ACTIVITIES; the workflow itself always lives on
  // `main`. So only ONE of the ~33 Workers below ever runs a workflow.
  //
  // Yet we hand `workflowsPath` to all of them, and each one therefore:
  //   1. runs a FULL WEBPACK BUNDLE BUILD at boot -- getOrCreateBundle()
  //      constructs a new WorkflowCodeBundler per Worker, nothing is shared
  //      (@temporalio/worker worker.js:434-446). That is ~33 webpack compiles.
  //   2. spawns a workflow thread with its own V8 isolate (worker.js:226-229)
  //   3. allocates a sticky workflow cache
  // For the 32 non-`main` Workers all three are dead weight: no workflow task
  // ever arrives on their queue. Measured: 34 isolates, ~868 MB of idle JS heap.
  //
  // The SDK skips the workflow thread entirely when no bundle is given, so
  // omitting `workflowsPath` removes all three costs. Verified: 34 isolates -> 2.
  //
  // Opt-in rather than the default ONLY because its safety rests on an invariant
  // nothing enforces: if a workflow were ever scheduled on a provider queue, no
  // Worker would poll for it and it would hang silently. True today; it would
  // fail quietly if that ever changed.
  const activityOnlyWorkers =
    process.env.TEMPORAL_ACTIVITY_ONLY_WORKERS === 'true';

  if (isWorkers) {
    // One line at boot so the effective config is verifiable in production
    // rather than assumed. Greppable as `[temporal]`.
    console.log(
      `[temporal] activityOnlyWorkers=${activityOnlyWorkers} ` +
        `divider=${divider} excludeQueues=[${excludeQueues.join(',')}]`
    );
  }

  return TemporalModule.register({
    isGlobal: true,
    connection: {
      address: process.env.TEMPORAL_ADDRESS || 'localhost:7233',
      ...(process.env.TEMPORAL_TLS === 'true' ? { tls: true } : {}),
      ...(process.env.TEMPORAL_API_KEY
        ? { apiKey: process.env.TEMPORAL_API_KEY }
        : {}),
      namespace: process.env.TEMPORAL_NAMESPACE || 'default',
    },
    taskQueue: 'main',
    logLevel: 'error',
    ...(isWorkers
      ? {
          workers: [
            { identifier: 'main', maxConcurrentJob: undefined },
            ...socialIntegrationList,
          ]
            .filter((f) => f.identifier.indexOf('-') === -1)
            .map((integration) => ({
              integration,
              taskQueue: integration.identifier.split('-')[0],
            }))
            .filter(({ taskQueue }) => !excludeQueues.includes(taskQueue))
            .map(({ integration, taskQueue }) => {
              // Split the per-provider cap across the servers sharing this
              // queue. Floor (never below 1) so the global total never exceeds
              // the provider's limit. Providers whose limit is smaller than the
              // server count must be pinned via EXCLUDE_QUEUE instead.
              const concurrency = integration.maxConcurrentJob
                ? Math.max(
                    1,
                    Math.floor(integration.maxConcurrentJob / divider)
                  )
                : undefined;

              // Workflows only ever run on `main`, so every other Worker can be
              // activity-only: no bundle => no webpack build, no workflow
              // thread, no V8 isolate, no sticky cache.
              const runsWorkflows = taskQueue === 'main' || !activityOnlyWorkers;

              return {
                taskQueue,
                ...(runsWorkflows ? { workflowsPath: path! } : {}),
                activityClasses: activityClasses!,
                autoStart: true,
                ...(concurrency
                  ? {
                      workerOptions: {
                        maxConcurrentActivityTaskExecutions: concurrency,
                      },
                    }
                  : {
                      workerOptions: {
                        maxConcurrentActivityTaskExecutions: 1000000,
                      },
                    }),
              };
            }),
        }
      : {}),
  });
};
