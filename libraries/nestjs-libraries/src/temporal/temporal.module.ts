import { TemporalModule } from 'nestjs-temporal-core';
import { socialIntegrationList } from '@gitroom/nestjs-libraries/integrations/integration.manager';
import * as dns from 'node:dns';

function resolveAddress(address: string): string {
  const [host, port] = address.split(':');
  const resolvedPort = port || '7233';

  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    return address;
  }

  try {
    const result = dns.lookupSync(host);
    console.log(`[TemporalModule] Resolved ${host} -> ${result.address}:${resolvedPort}`);
    return `${result.address}:${resolvedPort}`;
  } catch (e: any) {
    console.log(`[TemporalModule] DNS lookup failed for ${host}: ${e.message}, using original`);
    return address;
  }
}

const resolvedTemporalAddress = resolveAddress(process.env.TEMPORAL_ADDRESS || 'localhost:7233');

export const getTemporalModule = (
  isWorkers: boolean,
  path?: string,
  activityClasses?: any[]
) => {
  return TemporalModule.register({
    isGlobal: true,
    connection: {
      address: resolvedTemporalAddress,
      ...process.env.TEMPORAL_TLS === 'true' ? {tls: true} : {},
      ...process.env.TEMPORAL_API_KEY ? {apiKey: process.env.TEMPORAL_API_KEY} : {},
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
            })),
        }
      : {}),
  });
};
