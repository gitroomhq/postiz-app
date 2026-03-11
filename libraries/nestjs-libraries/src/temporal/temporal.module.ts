import { TemporalModule } from 'nestjs-temporal-core';
import { socialIntegrationList } from '@gitroom/nestjs-libraries/integrations/integration.manager';

export const getTemporalModule = (
  isWorkers: boolean,
  path?: string,
  activityClasses?: any[]
) => {
  return TemporalModule.register({
    isGlobal: true,
    connection: {
      address: process.env.TEMPORAL_ADDRESS || 'localhost:7233',
      ...process.env.TEMPORAL_TLS === 'true' ? {tls: true} : {},
      ...process.env.TEMPORAL_API_KEY ? {apiKey: process.env.TEMPORAL_API_KEY} : {},
      namespace: process.env.TEMPORAL_NAMESPACE || 'default',
    },
    taskQueue: 'main',
    logLevel: 'error',
    ...(isWorkers
      ? {
          workers: (() => {
            const seenQueues = new Set<string>();
            return [
              { identifier: 'main', maxConcurrentJob: undefined },
              ...socialIntegrationList,
            ]
              .filter((integration) => {
                const queue = integration.identifier.split('-')[0];
                if (seenQueues.has(queue)) return false;
                seenQueues.add(queue);
                return true;
              })
              .map((integration) => ({
                taskQueue: integration.identifier.split('-')[0],
                workflowsPath: path!,
                activityClasses: activityClasses!,
                autoStart: true,
                ...(integration.maxConcurrentJob
                  ? {
                      workerOptions: {
                        maxConcurrentActivityTaskExecutions:
                          integration.maxConcurrentJob,
                      },
                    }
                  : {}),
              }));
          })(),
        }
      : {}),
  });
};
