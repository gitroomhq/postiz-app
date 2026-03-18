import { TemporalModule } from 'nestjs-temporal-core';
import { socialIntegrationList } from "../integrations/integration.manager";
export const getTemporalModule = (isWorkers, path, activityClasses) => {
    return TemporalModule.register(Object.assign({ isGlobal: true, connection: Object.assign(Object.assign(Object.assign({ address: process.env.TEMPORAL_ADDRESS || 'localhost:7233' }, process.env.TEMPORAL_TLS === 'true' ? { tls: true } : {}), process.env.TEMPORAL_API_KEY ? { apiKey: process.env.TEMPORAL_API_KEY } : {}), { namespace: process.env.TEMPORAL_NAMESPACE || 'default' }), taskQueue: 'main', logLevel: 'error' }, (isWorkers
        ? {
            workers: [
                { identifier: 'main', maxConcurrentJob: undefined },
                ...socialIntegrationList,
            ]
                .filter((f) => f.identifier.indexOf('-') === -1)
                .map((integration) => (Object.assign({ taskQueue: integration.identifier.split('-')[0], workflowsPath: path, activityClasses: activityClasses, autoStart: true }, (integration.maxConcurrentJob
                ? {
                    workerOptions: {
                        maxConcurrentActivityTaskExecutions: integration.maxConcurrentJob,
                    },
                }
                : {})))),
        }
        : {})));
};
//# sourceMappingURL=temporal.module.js.map