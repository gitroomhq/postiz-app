import { ioRedis } from '@gitroom/nestjs-libraries/redis/redis.service';
import Bottleneck from 'bottleneck';
import { timer } from '@gitroom/helpers/utils/timer';

const connection = new Bottleneck.IORedisConnection({
  client: ioRedis,
});

const mapper = {} as Record<string, Bottleneck>;

export const concurrency = async <T>(
  identifier: string,
  maxConcurrent = 1,
  func: (...args: any[]) => Promise<T>,
  ignoreConcurrency = false
) => {
  const strippedIdentifier = identifier.toLowerCase().split('-')[0];
  mapper[strippedIdentifier] ??= new Bottleneck({
    id: strippedIdentifier + '-concurrency-new',
    maxConcurrent,
    datastore: 'ioredis',
    connection,
    minTime: 1000,
  });
  let load: T;
  try {
    if (ignoreConcurrency) {
      return await func();
    }
    load = await mapper[strippedIdentifier].schedule<T>(
      { expiration: 600000 },
      async () => {
        try {
          return await func();
        } catch (err) {}
      }
    );
  } catch (err) {}

  return load;
};
