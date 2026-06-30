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

              return {
                taskQueue,
                workflowsPath: path!,
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
