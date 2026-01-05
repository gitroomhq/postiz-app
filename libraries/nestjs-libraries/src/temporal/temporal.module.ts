import { TemporalModule } from 'nestjs-temporal-core';

export const getTemporalModule = (
  isWorkers: boolean,
  path?: string,
  activityClasses?: any[],
) => {
  return TemporalModule.register({
    isGlobal: true,
    connection: {
      address: process.env.TEMPORAL_ADDRESS || 'localhost:7233',
      namespace: process.env.TEMPORAL_NAMESPACE || 'default',
    },
    taskQueue: 'main',
    ...(isWorkers
      ? {
          worker: {
            workflowsPath: path!,
            activityClasses: activityClasses!,
            autoStart: true,
            workerOptions: {
              maxConcurrentActivityTaskExecutions: 24,
            },
          },
        }
      : {}),
  });
};
